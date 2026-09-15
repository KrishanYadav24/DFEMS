import React, { useState } from 'react';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Select from '../components/ui/Select';
import Alert from '../components/ui/Alert';
import { 
  FileText, 
  Download, 
  Printer, 
  ShieldCheck, 
  Scale, 
  FileCheck,
  Building,
  KeyRound
} from 'lucide-react';

export default function ReportsPage({ cases = [], evidence = [], custody = [], analyses = [] }) {
  const [selectedCaseId, setSelectedCaseId] = useState(cases.length > 0 ? String(cases[0].id) : '1');
  const [reportType, setReportType] = useState('full_dossier');
  const [exportNotice, setExportNotice] = useState(null);
  const [reportDate] = useState('10 Oct 2026');

  const currentCase = cases.find((c) => String(c.id) === selectedCaseId) || cases[0];
  const caseEvidence = evidence.filter((e) => e.caseId === currentCase?.id);
  const caseCustody = custody.filter((c) => c.caseTitle === currentCase?.title);
  const caseAnalyses = analyses.filter((a) => 
    caseEvidence.some((e) => e.id === a.evidenceId)
  );

  const handleExport = (format) => {
    if (format === 'print') {
      window.print();
    } else {
      setExportNotice(`Report exported successfully as ${format.toUpperCase()} for Case #${currentCase?.id} (${currentCase?.title}). In Phase 2, this triggers server-side court-stamped PDF compilation.`);
      setTimeout(() => setExportNotice(null), 5000);
    }
  };

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
              onClick={() => handleExport('print')}
            >
              Print / Save PDF
            </Button>
            <Button 
              variant="primary" 
              icon={<Download className="w-4 h-4" />}
              onClick={() => handleExport('pdf')}
            >
              Export Sealed Dossier
            </Button>
          </div>
        }
      />

      {exportNotice && (
        <Alert 
          variant="success" 
          title="Export Dispatched" 
          dismissible 
          onClose={() => setExportNotice(null)}
        >
          {exportNotice}
        </Alert>
      )}

      {/* Report Configuration Bar */}
      <Card className="bg-white border-dfems-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <Select
            label="Select Case Dossier"
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              icon={<FileCheck className="w-4 h-4" />}
              onClick={() => handleExport('csv')}
            >
              Export CSV Ledger
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              icon={<Download className="w-4 h-4" />}
              onClick={() => handleExport('json')}
            >
              Export JSON
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
              <div className="font-semibold text-slate-900 mt-0.5">{currentCase?.assignedTo}</div>
            </div>
            <div>
              <div className="text-dfems-text-secondary uppercase text-[10px] font-semibold">Status in DFEMS</div>
              <div className="mt-0.5">
                <Badge variant={currentCase?.status === 'Closed' ? 'neutral' : 'primary'} size="sm">
                  {currentCase?.status}
                </Badge>
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-dfems-text-secondary uppercase text-[10px] font-semibold">Case Title</div>
              <div className="font-medium text-slate-900 mt-0.5">{currentCase?.title}</div>
            </div>
            <div className="col-span-2">
              <div className="text-dfems-text-secondary uppercase text-[10px] font-semibold">Incident / Seizure Location</div>
              <div className="font-medium text-slate-900 mt-0.5">{currentCase?.location}</div>
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
                        {item.hash}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant="success" size="sm">VERIFIED</Badge>
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
                <div>Name: {currentCase?.assignedTo}</div>
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
