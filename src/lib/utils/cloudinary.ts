/**
 * 瀏覽器端上傳圖片至 Cloudinary（unsigned preset）。
 * 勿將 **API Secret** 放進前端；僅使用 Dashboard 設好的 **upload preset**。
 */
export async function uploadAvatarToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "xuuq52t8");
  formData.append("folder", "avatars");

  const res = await fetch(
    "https://api.cloudinary.com/v1_1/dardg7ix6/image/upload",
    { method: "POST", body: formData },
  );

  if (!res.ok) {
    throw new Error("上傳失敗");
  }

  const data = (await res.json()) as { secure_url?: string };
  if (!data.secure_url) {
    throw new Error("上傳失敗：回傳缺少網址");
  }

  return data.secure_url;
}
