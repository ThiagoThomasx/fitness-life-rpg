"use client"

import { useRouter } from "next/navigation"

export function NutritionHeader() {
  const router = useRouter()
  return (
    <div className="nutrition-header">
      <button onClick={() => router.back()} className="nutrition-header__back" aria-label="Voltar">
        ←
      </button>
      <div>
        <h1 className="nutrition-header__title">🥗 Nutrição</h1>
        <p className="nutrition-header__subtitle">Macros e calorias do dia</p>
      </div>
    </div>
  )
}
