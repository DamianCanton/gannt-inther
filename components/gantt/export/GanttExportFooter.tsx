export interface GanttExportFooterProps {
  exportDate: string
}

export function GanttExportFooter({ exportDate }: GanttExportFooterProps) {
  return (
    <footer className="print-footer">
      <span>INTHER S.R.L. — Aire Acondicionado</span>
      <span className="print-footer__date">Exportado: {exportDate}</span>
    </footer>
  )
}
