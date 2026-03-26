import { Settings } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Settings className="w-8 h-8 text-gray-400" />
      </div>
      <h2 className="text-lg font-semibold text-gray-700 mb-2">
        系統設定
      </h2>
      <p className="text-sm text-gray-400">
        此功能將在 Wave 2 開放
      </p>
    </div>
  );
}
