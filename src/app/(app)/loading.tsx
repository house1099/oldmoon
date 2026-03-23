export default function AppSegmentLoading() {
  return (
    <div
      className="flex w-full min-h-[40vh] items-center justify-center px-4 py-20"
      aria-busy="true"
      aria-label="頁面載入中"
    >
      <div className="guild-route-loading-orb" role="presentation" />
    </div>
  );
}
