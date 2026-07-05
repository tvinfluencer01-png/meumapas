// Estilo padronizado para todos os <Tooltip /> do Recharts.
// Fundo igual ao card do gráfico, texto branco, borda destacada.
export const chartTooltipProps = {
  contentStyle: {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--primary) / 0.5)",
    borderRadius: 10,
    boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
    color: "hsl(0 0% 100%)",
    padding: "8px 12px",
  } as React.CSSProperties,
  labelStyle: {
    color: "hsl(0 0% 100%)",
    fontWeight: 600,
    marginBottom: 4,
  } as React.CSSProperties,
  itemStyle: {
    color: "hsl(0 0% 100%)",
  } as React.CSSProperties,
  cursor: {
    stroke: "hsl(var(--primary))",
    strokeOpacity: 0.25,
    strokeWidth: 2,
    fill: "hsl(var(--primary) / 0.06)",
  },
  wrapperStyle: {
    outline: "none",
  } as React.CSSProperties,
};
