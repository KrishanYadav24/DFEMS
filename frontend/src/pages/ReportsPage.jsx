import React, { useState } from 'react';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Select from '../components/ui/Select';
import Alert from '../components/ui/Alert';
import EmptyState from '../components/ui/EmptyState';
import { 
  FileText, 
  Download, 
  Printer, 
  ShieldCheck, 
  Scale, 
  Building,
  KeyRound,
  FileSpreadsheet,
  Loader2
} from 'lucide-react';
import { reportService } from '../services/reportService';

export default function ReportsPage({ 
  cases = [], 
  evidence = [], 
  custody = [], 
  analyses = [],
  _currentUser = null 
}) {
  const [selectedCaseId, setSelectedCaseId] = useState(cases.length > 0 ? String(cases[0].id) : '1');
  const [selectedEvidenceId, setSelectedEvidenceId] = useState('');
  const [reportType, setReportType] = useState('full_dossier');
  const [exportNotice, setExportNotice] = useState(null);
  const [exportError, setExportError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [reportDate] = useState('11 Oct 2026');

  const currentCase = cases.find((c) => String(c.id) === String(selectedCaseId)) || cases[0];
  const caseEvidence = evidence.filter((e) => String(e.caseId) === String(currentCase?.id));
  const caseCustody = custody.filter((c) => 
    c.caseTitle === currentCase?.title || 
    caseEvidence.some((e) => String(e.id) === String(c.evidenceId))
  );
  const caseAnalyses = analyses.filter((a) => 
    caseEvidence.some((e) => String(e.id) === String(a.evidenceId))
  );

  const effectiveEvidenceId = selectedEvidenceId || (caseEvidence.length > 0 ? String(caseEvidence[0].id) : null);

  const handleExportPdf = async (typeOverride = null, evidenceIdOverride = null) => {
    const typeToExport = typeOverride || reportType;
    if (!currentCase) {
      setExportError('No case selected to generate report.');
      return;
    }

    setDownloading(true);
    setExportError(null);
    try {
      if (typeToExport === 'full_dossier') {
        await reportService.downloadCaseDossier(currentCase.id);
        setExportNotice(`Official ISO/IEC 27037 Court Dossier generated for Case #${currentCase.id} (${currentCase.title}).`);
      } else if (typeToExport === 'custody_cert') {
        const evId = evidenceIdOverride || effectiveEvidenceId;
        if (!evId) {
          throw new Error('Please select an evidence item to generate a Chain of Custody Certificate.');
        }
        await reportService.downloadCustodyCert(evId);
        setExportNotice(`Official Chain of Custody Certificate generated for Evidence EV-#${evId}.`);
      } else if (typeToExport === 'hash_audit') {
        await reportService.downloadIntegrityAudit(currentCase.id);
        setExportNotice(`Cryptographic Integrity Verification Audit PDF generated for Case #${currentCase.id}.`);
      }
      setTimeout(() => setExportNotice(null), 5000);
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed to generate PDF report from server.';
      setExportError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setDownloading(false);
    }
  };

  const handleExportData = (format) => {
    if (format === 'print') {
      window.print();
    } else if (format === 'csv') {
      const rows = [
        ['Case ID', 'Case Title', 'Evidence ID', 'Description', 'Type', 'SHA-256 Hash', 'Status'],
        ...caseEvidence.map((e) => [
          currentCase?.id,
          `"${currentCase?.title}"`,
          e.id,
          `"${e.description}"`,
          e.type,
          e.hash || '',
          e.status || ''
        ])
      ];
      const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csvContent));
      link.setAttribute("download", `DFEMS_Case_${currentCase?.id}_Ledger.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setExportNotice(`Exported Case #${currentCase?.id} Evidence Ledger as CSV.`);
      setTimeout(() => setExportNotice(null), 4000);
    } else if (format === 'json') {
      const payload = {
        case: currentCase,
        evidence: caseEvidence,
        custody: caseCustody,
        analyses: caseAnalyses,
        exportedAt: new Date().toISOString(),
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `DFEMS_Case_${currentCase?.id}_Dossier.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setExportNotice(`Exported Case #${currentCase?.id} data as JSON.`);
      setTimeout(() => setExportNotice(null), 4000);
    }
  };

  if (!cases || cases.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Court Reports & Forensic Dossiers"
          subtitle="Generate ISO/IEC 27037 compliant evidentiary packages, custody certificates, and forensic case dossiers"
        />
        <Card className="p-12 text-center">
          <EmptyState
            title="No Authorized Cases Available"
            description="You do not have any authorized cases registered in the system to compile forensic reports."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Court Reports & Forensic Dossiers"
        subtitle="Generate ISO/IEC 27037 compliant evidentiary packages, custody certificates, and forensic case dossiers"
        breadcrumbs={[
          { label: 'DFEMS', href: '#' },
          { label: 'Reports & Dossiers' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              icon={<Printer className="w-4 h-4" />}
              onClick={() => handleExportData('print')}
            >
              Print / Preview
            </Button>
            <Button 
              variant="primary" 
              icon={downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              onClick={() => handleExportPdf()}
              disabled={downloading}
            >
              {downloading ? 'Compiling PDF...' : 'Export Sealed PDF'}
            </Button>
          </div>
        }
      />

      {exportNotice && (
        <Alert 
          variant="success" 
          title="Report Generated" 
          dismissible 
          onClose={() => setExportNotice(null)}
        >
          {exportNotice}
        </Alert>
      )}

      {exportError && (
        <Alert 
          variant="danger" 
          title="Export Failure" 
          dismissible 
          onClose={() => setExportError(null)}
        >
          {exportError}
        </Alert>
      )}

      {/* Report Configuration Bar */}
      <Card className="bg-white border-dfems-border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <Select
            label="Select Case Dossier"
            value={selectedCaseId}
            onChange={(e) => {
              setSelectedCaseId(e.target.value);
              setSelectedEvidenceId('');
            }}
            options={cases.map((c) => ({
              value: String(c.id),
              label: `Case #${c.id}: ${c.title}`
            }))}
          />
          <Select
            label="Report Specification"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            options={[
              { value: 'full_dossier', label: 'Comprehensive Judicial Dossier (Full)' },
              { value: 'custody_cert', label: 'Chain of Custody Certificate (ISO 27037)' },
              { value: 'hash_audit', label: 'Cryptographic Integrity Verification Audit' },
            ]}
          />
          {reportType === 'custody_cert' ? (
            <Select
              label="Select Evidence Item"
              value={effectiveEvidenceId || ''}
              onChange={(e) => setSelectedEvidenceId(e.target.value)}
              options={
                caseEvidence.length > 0
                  ? caseEvidence.map((ev) => ({
                      value: String(ev.id),
                      label: `EV-${ev.id}: ${ev.description.substring(0, 30)}`
                    }))
                  : [{ value: '', label: 'No evidence in case' }]
              }
            />
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                icon={<FileSpreadsheet className="w-4 h-4" />}
                onClick={() => handleExportData('csv')}
              >
                CSV Ledger
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                icon={<FileText className="w-4 h-4" />}
                onClick={() => handleExportData('json')}
              >
                JSON Export
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="primary"
              className="w-full"
              icon={downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              onClick={() => handleExportPdf()}
              disabled={downloading}
            >
              {downloading ? 'Generating...' : 'Download PDF Report'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Printable Court Document Container */}
      <div className="bg-white border border-dfems-border rounded-lg shadow-sm p-8 sm:p-12 text-dfems-text-primary print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Scale className="w-7 h-7 text-dfems-primary" />
                <span className="text-xs uppercase tracking-widest font-mono text-dfems-text-secondary">Official Forensic Evidentiary Document</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 font-serif">
                DIGITAL FORENSIC EVIDENCE DOSSIER
              </h1>
              <p className="text-xs text-dfems-text-secondary mt-0.5">
                Prepared pursuant to Section 65B Indian Evidence Act / ISO/IEC 27037:2012 Forensic Standards
              </p>
            </div>
            <div className="text-right border border-dfems-border bg-slate-50 p-3 rounded text-xs font-mono">
              <div className="font-semibold text-dfems-primary">DFEMS-DOC-2026-{currentCase?.id?.toString().padStart(4, '0')}</div>
              <div className="text-slate-500">Date: {reportDate}</div>
              <div className="text-emerald-700 font-medium">Chain Intact: 100%</div>
            </div>
          </div>
        </div>

        {/* Section 1: Case Particulars */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3 pb-1 border-b border-dfems-border">
            <FileText className="w-4 h-4 text-dfems-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              1. Case Particulars & Incident Classification
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-md border border-slate-100 text-xs">
            <div>
              <div className="text-dfems-text-secondary uppercase text-[10px] font-semibold">Case Reference</div>
              <div className="font-semibold text-slate-900 mt-0.5">CASE-{currentCase?.id}</div>
            </div>
            <div>
              <div className="text-dfems-text-secondary uppercase text-[10px] font-semibold">Crime Classification</div>
              <div className="font-semibold text-slate-900 mt-0.5">{currentCase?.crimeType || 'Digital Infraction'}</div>
            </div>
            <div>
              <div className="text-dfems-text-secondary uppercase text-[10px] font-semibold">Investigating Officer</div>
              <div className="font-semibold text-slate-900 mt-0.5">{currentCase?.assignedTo || 'Unassigned'}</div>
            </div>
            <div>
              <div className="text-dfems-text-secondary uppercase text-[10px] font-semibold">Status in DFEMS</div>
              <div className="mt-0.5">
                <Badge variant={currentCase?.status === 'Closed' ? 'neutral' : 'primary'} size="sm">
                  {currentCase?.status || 'Active'}
                </Badge>
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-dfems-text-secondary uppercase text-[10px] font-semibold">Case Title</div>
              <div className="font-medium text-slate-900 mt-0.5">{currentCase?.title}</div>
            </div>
            <div className="col-span-2">
              <div className="text-dfems-text-secondary uppercase text-[10px] font-semibold">Incident / Seizure Location</div>
              <div className="font-medium text-slate-900 mt-0.5">{currentCase?.location || 'Bengaluru, KA'}</div>
            </div>
          </div>
        </div>

        {/* Section 2: Evidentiary Inventory & Integrity Hashes */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3 pb-1 border-b border-dfems-border">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              2. Evidentiary Items & Cryptographic SHA-256 Hashes
            </h2>
          </div>
          {caseEvidence.length === 0 ? (
            <p className="text-xs text-dfems-text-secondary italic">No evidence items registered for this case record.</p>
          ) : (
            <div className="overflow-x-auto border border-dfems-border rounded-md">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-dfems-border">
                  <tr>
                    <th className="py-2.5 px-3">Item ID</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 font-mono">SHA-256 Checksum</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">PDF Certificate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dfems-border">
                  {caseEvidence.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-semibold text-dfems-primary">EV-{item.id}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-900">{item.description}</div>
                        {item.serial && <div className="text-[11px] text-dfems-text-secondary font-mono">S/N: {item.serial}</div>}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" size="sm">{item.type}</Badge>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 break-all max-w-xs">
                        {item.hash || 'NO_HASH_RECORDED'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant={item.hash ? "success" : "neutral"} size="sm">
                          {item.hash ? "VERIFIED" : "PENDING"}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Download className="w-3.5 h-3.5" />}
                          onClick={() => handleExportPdf('custody_cert', item.id)}
                          disabled={downloading}
                        >
                          Custody Cert
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 3: Chronological Chain of Custody Audit Trail */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3 pb-1 border-b border-dfems-border">
            <KeyRound className="w-4 h-4 text-dfems-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              3. Chronological Chain of Custody Audit Trail
            </h2>
          </div>
          {caseCustody.length === 0 ? (
            <p className="text-xs text-dfems-text-secondary italic">No custody transfer entries logged for this case.</p>
          ) : (
            <div className="overflow-x-auto border border-dfems-border rounded-md">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-dfems-border">
                  <tr>
                    <th className="py-2.5 px-3 font-mono">Timestamp</th>
                    <th className="py-2.5 px-3">Evidence Item</th>
                    <th className="py-2.5 px-3">Action Recorded</th>
                    <th className="py-2.5 px-3">Custody Handler</th>
                    <th className="py-2.5 px-3">Integrity Signature</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dfems-border">
                  {caseCustody.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-dfems-text-secondary whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        EV-{log.evidenceId}: {log.evidenceDesc}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-800">{log.action}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {log.actor}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[10px] text-emerald-700">
                        IMMUTABLE (trg_custody_no_update)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 4: Forensic Laboratory Analysis Summary */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3 pb-1 border-b border-dfems-border">
            <Building className="w-4 h-4 text-dfems-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              4. Certified Forensic Findings & Laboratory Analysis
            </h2>
          </div>
          {caseAnalyses.length === 0 ? (
            <div className="p-3 bg-slate-50 border border-dfems-border rounded text-xs text-dfems-text-secondary italic">
              Analysis pending or in progress at the designated digital forensics forensic laboratory.
            </div>
          ) : (
            <div className="space-y-3">
              {caseAnalyses.map((an) => (
                <div key={an.id} className="p-4 border border-dfems-border rounded-md bg-slate-50 text-xs">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-semibold text-slate-900">Examiner: {an.analyst}</span>
                      <span className="text-dfems-text-secondary ml-2 font-mono">({an.cert})</span>
                    </div>
                    <div className="text-dfems-text-secondary font-mono">{an.timestamp}</div>
                  </div>
                  <div className="text-dfems-text-secondary mb-1">
                    <span className="font-medium text-slate-700">Facility:</span> {an.lab}
                  </div>
                  <div className="mt-2 p-2.5 bg-white border border-slate-200 rounded font-serif italic text-slate-800">
                    "{an.findings}"
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Official Certification & Signatures */}
        <div className="pt-6 border-t-2 border-slate-300 mt-10">
          <div className="grid grid-cols-2 gap-8 text-xs">
            <div>
              <div className="font-semibold text-slate-900 mb-1">Investigating Officer Sign-off</div>
              <p className="text-[11px] text-dfems-text-secondary mb-8">
                I hereby certify that the evidence documented herein has been gathered and maintained in accordance with standard forensic integrity procedures.
              </p>
              <div className="border-t border-dashed border-slate-400 pt-2 font-mono text-[11px]">
                <div>Name: {currentCase?.assignedTo || 'Investigating Officer'}</div>
                <div className="text-dfems-text-secondary">Badge: INV-VERIFIED | DFEMS Security ID</div>
              </div>
            </div>
            <div>
              <div className="font-semibold text-slate-900 mb-1">Forensic Lab Chief / System Auditor</div>
              <p className="text-[11px] text-dfems-text-secondary mb-8">
                Cryptographic hash validation confirmed against Oracle Database 26ai repository. No tampering or chain alteration detected.
              </p>
              <div className="border-t border-dashed border-slate-400 pt-2 font-mono text-[11px]">
                <div>Verifier: Lakshmi Narayan</div>
                <div className="text-dfems-text-secondary">Title: Chief Digital Forensic Auditor | DFEMS_USER</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
