import cron from 'node-cron';
import { env } from '../config/env.js';
import { Report } from '../models/report.model.js';
import { emitReportUpdated } from '../realtime/socket.js';

export async function escalateOldReports(): Promise<number> {
  // TODO V6 CRON 1
  // Calcula el threshold usando REPORT_ESCALATION_MINUTES. Después consulta los
  // Reports OPEN creados antes o en ese threshold. Por cada Report, cambia el
  // status a ESCALATED, guarda el cambio y emite report:updated con el helper
  // existente. La función debe regresar el número de Reports escalados.
  
  const thresholdDate = new Date();
  thresholdDate.setMinutes(thresholdDate.getMinutes() - env.reportEscalationMinutes);

  const reportsToEscalate = await Report.find({
    status: 'OPEN',
    createdAt: { $lte: thresholdDate }
  });
  for (const report of reportsToEscalate) {
    const userId = report.userId.toString();
    report.status = 'ESCALATED';
    await report.save(); 
    await report.populate(['userId', 'channelId']);
    
    emitReportUpdated(userId, report); // Helper de sockets
  }
  return reportsToEscalate.length;
}

export function startReportEscalationJob(): void {
  // TODO V6 CRON 2
  // Programa la ejecución periódica de escalateOldReports() usando node-cron y
  // env.reportEscalationCron. Controla los errores para que una falla del job
  // no detenga el servidor.
  cron.schedule(env.reportEscalationCron, () => {
    void escalateOldReports().catch((error: unknown) => {
      console.error('Report escalation job failed:', error);
    });
  });
}
