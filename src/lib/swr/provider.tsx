'use client'

import type { ReactNode } from 'react'
import { SWRConfig } from 'swr'

export default function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 300000, // 5 分鐘內不重複請求（與探索列表 DB 快取對齊）
        keepPreviousData: true,
        errorRetryCount: 2,
      }}
    >
      {children}
    </SWRConfig>
  )
}
