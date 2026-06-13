## Проблема

`submitApproval()` в `core/ai-safety/human-oversight.ts` (строки 508–543) — это human-in-the-loop шлюз для высокорисковых действий агента. Метод складывал каждое входящее одобрение в `request.approvals`, а затем сравнивал с порогом **количество строк**:

```ts
request.approvals.push({ approverId, decision, reason, timestamp: new Date() });

const approveCount = request.approvals.filter((a) => a.decision === 'approved').length; // считает строки, а не уникальных аппруверов
if (approveCount >= requiredApprovals) request.status = 'approved';
```

Дедупликации по `approverId` не было, как и проверки, что аппрувер вообще имеет право голосовать на данном уровне. Поэтому один и тот же вызывающий мог вызвать `submitApproval()` N раз и **в одиночку** набрать любой кворум N-из-M — например, одобрить крупный вывод средств или отмену kill-switch. Контрол выглядел как «многоподписный», но фактически был одноподписным. Та же ошибка подсчёта строк была и в `checkApprovalStatus()`.

## Решение

### `core/ai-safety/human-oversight.ts`

- **Проверка полномочий.** Перед учётом голоса `submitApproval()` вызывает новый приватный хелпер `isApproverAuthorized(request.level, approval)` и бросает ошибку, если аппрувер не авторизован для уровня запроса:
  - если настроен allow-list `approvalWorkflow.approvers` — схема **fail-closed**: голосовать могут только зарегистрированные аппруверы и только со своими зарегистрированными ролями;
  - иначе проверяется роль, переданная аутентифицированным слоем через `ApprovalInput.approverRole`, против `level.approverRoles`;
  - легаси-вызовы без роли и без allow-list по-прежнему проходят (обратная совместимость), но дыру с самоодобрением закрывает подсчёт по уникальным аппруверам.
- **Коалесцирование голосов.** Повторное голосование того же `approverId` обновляет существующее решение (decision/reason/timestamp), а не добавляет новую строку.
- **Подсчёт по уникальным.** `approveCount` и `denyCount` считаются по **уникальным** `approverId` через новый хелпер `countDistinctDecisions()` (берётся последнее решение каждого аппрувера). Та же логика применена в `checkApprovalStatus()`.

### `core/ai-safety/types.ts`

- Добавлено опциональное поле `ApprovalWorkflowConfig.approvers?: ApproverIdentity[]` — allow-list соответствий «идентичность аппрувера → его роли». При наличии включает fail-closed режим.
- Добавлен интерфейс `ApproverIdentity { approverId; roles }`.
- В `ApprovalInput` (в `human-oversight.ts`) добавлено опциональное поле `approverRole?: string` для роли, заявленной аутентифицированным слоем.

### `tests/ai-safety/ai-safety.test.ts`

Добавлен блок из 6 регрессионных тестов `Multi-party quorum (LOGIC-23)`:
- один аппрувер тремя голосами **не** закрывает кворум 3-из-3 (статус остаётся `pending`, `approvals.length === 1`);
- кворум достигается только нужным числом **уникальных** авторизованных аппруверов;
- повторный голос коалесцируется как обновление (побеждает последнее решение);
- аппрувер с ролью, не разрешённой для уровня запроса, отклоняется;
- `checkApprovalStatus` считает уникальных, а не строки;
- настроенный allow-list (registry) работает по схеме fail-closed: посторонняя идентичность отклоняется, два зарегистрированных аппрувера дают `approved`.

## Критерии приёмки

- [x] `submitApproval` отклоняет/коалесцирует повторный голос от `approverId`, уже проголосовавшего по запросу.
- [x] Кворум (`approveCount >= requiredApprovers`) считается по **уникальным** ID аппруверов, а не по строкам.
- [x] Аппрувер, не авторизованный для `request.level`, не может участвовать в кворуме.
- [x] Регрессионный тест: тот же аппрувер, отправивший `requiredApprovers` одобрений, оставляет запрос `pending`; столько же **уникальных** авторизованных аппруверов переводят его в `approved`.
- [x] То же правило уникальности применено к `denyCount`.

## Как воспроизвести

Standalone-скрипт сравнивает багованную и исправленную арифметику для запроса уровня 3 (`requiredApprovers: 3`):

```
node experiments/logic-review-v2/repro-LOGIC-23-approval-no-dedup.mjs
```

```
[buggy]  rows counted     : 3  -> status: approved
[fixed]  distinct counted : 1  -> status: pending
BUG REPRODUCED: one approver reached a 3-of-3 quorum; the fix keeps it pending.
```

## Проверка

Все локальные CI-проверки проходят:

```
typecheck : tsc --noEmit          OK
lint      : eslint                0 errors
test      : vitest run            8708 passed | 26 skipped
build     : tsup                  Build success
audit     : npm audit --high      0 vulnerabilities
```

Fixes #433
