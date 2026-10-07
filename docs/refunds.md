# Reembolsos

`POST /refunds` con cuerpo `{ "paymentId": "pay_...", "amount": 200 }`.

| Caso | Respuesta |
|---|---|
| Reembolso parcial válido | `200` con el cargo actualizado (`refunded` acumulado) |
| Sin `amount` | Reembolsa el saldo pendiente |
| `amount` mayor al saldo | `400` · "Sólo quedan N MXN por reembolsar" |
| Cargo ya reembolsado por completo | `409` |
| Cargo inexistente | `404` |
