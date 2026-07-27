# Release Candidate v2.0.0-rc1 — Fitness Life RPG

Consolida a Sprint 31. Ver [`SPRINT-31.md`](SPRINT-31.md) para o relatório
completo de auditoria e [`QA-CHECKLIST.md`](QA-CHECKLIST.md) para o checklist
de release.

## Estado dos gates

```text
Lint:      ✅
Typecheck: ✅
Tests:     ✅ 1616/1616 (128 arquivos)
Build:     ✅ (First Load JS de /dashboard: 299 kB → 189 kB)
```

## O que muda nesta release

Nenhuma feature nova. Consolidação de confiabilidade:

- Code-splitting do `recharts` no Dashboard (-110 kB no First Load JS da rota
  mais visitada)
- Boundaries de `loading`/`error` para todas as 21 rotas do app (nenhuma
  tinha antes)
- Acessibilidade: widgets do Diário (`EnergyStars`/`MoodPicker`) e campos de
  formulário (sono, notas, Nutrição) agora navegáveis/anunciáveis por leitor
  de tela; contraste de texto secundário elevado a AA
  (`--color-text-muted`)
- Guard de tamanho de arquivo no import de backup (paridade com Health Data)
- Dois testes com dependência de tempo real (`setTimeout`) tornados
  determinísticos

## Escopo de auditoria coberto

Arquitetura e dead code, rotas, dados/storage/backup/restore/reset,
segurança, acessibilidade, performance/bundle, cobertura de testes — ver
`ARCHITECTURE-AUDIT.md`, `STORAGE-AUDIT.md`, `PERFORMANCE-AUDIT.md`,
`ACCESSIBILITY-AUDIT-V2.md` para o detalhe de cada frente.

## Riscos residuais conhecidos (não bloqueantes)

1. Restore de backup antigo/parcial não limpa chaves ausentes do payload —
   decisão de produto pendente (preservar vs. limpar).
2. Sem `version`/`migrate` formal no `persist()` do Zustand.
3. Muitos domínios só têm reset via wipe total, sem reset granular dedicado.
4. Duplicação de helpers matemáticos (`round`/`average`/`clamp`) em ~10
   arquivos de engines — débito técnico de DRY.
5. `sessao/page.tsx` e `plano/page.tsx` concentram funções/arquivos grandes —
   candidatos a uma sprint de refactor dedicada.
6. Engines determinísticos sem teste direto: `attributes.ts`,
   `progression.ts`, `health-data/stats.ts`, `recommendations.ts`,
   `recommendation-assembly.ts`, `weekly-plan.ts`, `weekly-progress.ts`,
   `auto-tags.ts`.
7. Round-trip de backup via arquivo real (upload de `.json`) não testado
   manualmente nesta sessão — limitação da ferramenta de browser disponível,
   não do código; coberto por teste automatizado (`backup.test.ts`) e
   auditoria de código.
8. Live regions de sucesso/erro montadas condicionalmente (não persistentes
   no DOM) em vários formulários — comunicação de status pode ser perdida
   por leitores de tela na primeira renderização.
9. `/style-guide` é uma rota órfã (referência interna de dev, decisão
   consciente, não bug).
10. Warning de hydration pré-existente observado em `DashboardHero`/entorno
    — não introduzido nesta sprint, não investigado a fundo.

Nenhum dos itens acima é um bloqueador estrutural (perda de dado,
funcionalidade quebrada, vulnerabilidade real, gate vermelho).

## Avaliação final

**Pronto para Release Candidate v2**, com os riscos residuais acima
documentados e não bloqueantes. Recomendação de próximos passos: (a) decisão
de produto sobre o comportamento de restore parcial (risco #1), (b) sprint de
dívida técnica focada em testes de engine + consolidação de helpers
duplicados (riscos #4 e #6), (c) QA manual de upload de arquivo real antes do
lançamento público, se uma ferramenta com suporte a `<input type="file">`
estiver disponível.

## Versionamento

Documentação preparada para **v2.0.0-rc1**. `package.json` não foi alterado
automaticamente — o projeto não tem hoje uma estratégia formal de
versionamento semântico automatizada; a decisão de bump fica com o
mantenedor.
