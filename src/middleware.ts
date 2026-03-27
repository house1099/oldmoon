/**
 * 路由守衛（Edge）：略過 `/_next`、`/static`、`/api/*`、常見靜態副檔名；
 * 其餘依 Session／Profile／`users.status` 導向 `/login`、`/register/profile` 或封禁登出。
 */
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Database } from "@/types/database.types";
import { deriveAuthStatus } from "@/services/auth-status";

function isApiOrStatic(pathname: string) {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    pathname === "/static" ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json" ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$/.test(pathname)
  );
}

/** 未登入也可進入 */
function isPublicAuthPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname.startsWith("/auth/") ||
    pathname === "/register" ||
    pathname.startsWith("/register/")
  );
}

function isProfileSetupPath(pathname: string) {
  return (
    pathname === "/register/profile" ||
    pathname.startsWith("/register/profile/")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isApiOrStatic(pathname)) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const auth = await deriveAuthStatus(user);

  const loginUrl = new URL("/login", request.url);
  const profileUrl = new URL("/register/profile", request.url);
  const homeUrl = new URL("/", request.url);

  // --- 放逐：一律登出並導向 /login?error=banned（清除 session 後下一輪即可正常進入 /login） ---
  if (auth.kind === "banned") {
    return signOutAndRedirectBanned(request, loginUrl);
  }

  // --- 已登入且資料齊全：離開登入／註冊入口 ---
  if (user && auth.kind === "authenticated") {
    if (pathname === "/login" || pathname === "/register") {
      return NextResponse.redirect(homeUrl);
    }
  }

  if (user && auth.kind === "needs_profile") {
    if (pathname === "/login" || pathname === "/register") {
      return NextResponse.redirect(profileUrl);
    }
  }

  const registerTagOnboardingPaths = new Set([
    "/register/interests",
    "/register/skills",
    "/register/skills-offer",
    "/register/skills-want",
    "/register/matchmaking",
  ]);
  if (registerTagOnboardingPaths.has(pathname)) {
    if (!user) {
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (auth.kind === "needs_profile") {
      return NextResponse.redirect(profileUrl);
    }
  }

  // --- 公開與補資料路徑 ---
  if (isPublicAuthPath(pathname)) {
    if (isProfileSetupPath(pathname)) {
      if (!user) {
        loginUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(loginUrl);
      }
      if (auth.kind === "authenticated") {
        return NextResponse.redirect(homeUrl);
      }
      return response;
    }

    return response;
  }

  // --- 後台路由：/admin/* 權限檢查 ---
  if (pathname.startsWith("/admin")) {
    if (auth.kind !== "authenticated") {
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    const role = auth.profile.role;
    if (role !== "master" && role !== "moderator") {
      return NextResponse.redirect(homeUrl);
    }
    if (pathname.startsWith("/admin/coins") && role !== "master") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (pathname.startsWith("/admin/audit") && role !== "master") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    const moderatorAllowed = ["/admin", "/admin/users", "/admin/invitations", "/admin/exp", "/admin/publish", "/admin/reports"];
    if (
      role === "moderator" &&
      !moderatorAllowed.includes(pathname)
    ) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return response;
  }

  // --- 受保護路徑 ---
  if (auth.kind === "unauthenticated") {
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (auth.kind === "needs_profile") {
    return NextResponse.redirect(profileUrl);
  }

  return response;
}

async function signOutAndRedirectBanned(
  request: NextRequest,
  loginUrl: URL,
) {
  const url = new URL(loginUrl);
  url.searchParams.set("error", "banned");

  const redirectResponse = NextResponse.redirect(url);

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  await supabase.auth.signOut();

  return redirectResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|api|.*\\..*).*)",
  ],
};
