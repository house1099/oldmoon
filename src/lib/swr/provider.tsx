'use client'

import type { ReactNode } from 'react'
import { SWRConfig } from 'swr'

export default function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 30000, // 30秒內不重複請求
        errorRetryCount: 2,
      }}
    >
      {children}
    </SWRConfig>
  )
}
