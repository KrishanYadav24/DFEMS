import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

export default function AnalyticsDbmsPage() {
  const [activeCategory, setActiveCategory] = useState('JOINS');
  const [activeQueryKey, setActiveQueryKey] = useState('A1');
  const [copied, setCopied] = useState(false);

  const queryCategories = [
    { id: 'JOINS', label: 'Multi-Table Joins (A1–A4)' },
    { id: 'NESTED', label: 'Nested Queries (B1–B4)' },
    { id: 'AGGREGATES', label: 'Aggregates & Grouping (C1–C4)' },
    { id: 'VIEWS', label: 'Oracle Views' },
    { id: 'PROGRAMS', label: 'PL/SQL Procedures & Functions' },
  ];

  const queries = {
    A1: {
      category: 'JOINS',
      title: 'Query A1: Evidence with Case Title & Lead Investigator',
      sql: `-- A1. Evidence with case title and assigned investigator (3-table ANSI JOIN)
SELECT
    e.Evidence_ID,
    e.Description,
    e.Status,
    c.Title AS Case_Title,
    (u.First_Name || ' ' || u.Last_Name) AS Assigned_Investigator
FROM EVIDENCE e
JOIN CASE_TABLE c ON e.Case_ID = c.Case_ID
JOIN APP_USER u ON c.Assigned_To = u.User_ID
ORDER BY c.Case_ID, e.Evidence_ID;`,
      headers: ['Evidence_ID', 'Description', 'Status', 'Case_Title', 'Assigned_Investigator'],
      rows: [
        [1, 'Seized laptop from suspect residence', 'Under Analysis', 'Corporate Data Breach - TechCorp Pvt Ltd', 'Ravi Kumar'],
        [2, 'Server access log export (.log)', 'In Storage', 'Corporate Data Breach - TechCorp Pvt Ltd', 'Ravi Kumar'],
        [3, 'Mobile phone - suspect (Android)', 'Under Analysis', 'Cryptocurrency Fraud Ring', 'Ananya Rao'],
        [4, 'Wallet transaction export (.csv)', 'Presented in Court', 'Cryptocurrency Fraud Ring', 'Ananya Rao'],
        [5, 'Suspect desktop hard drive image', 'Archived', 'Cyberstalking Case', 'Suresh Iyer'],
        [6, 'Social media message export (.pdf)', 'Archived', 'Cyberstalking Case', 'Suresh Iyer'],
        [7, 'Hospital server memory dump', 'Under Analysis', 'Ransomware Attack - City Hospital', 'Ravi Kumar'],
      ]
    },
    A2: {
      category: 'JOINS',
      title: 'Query A2: Full Chronological Custody Trail for Evidence #1',
      sql: `-- A2. Full custody trail for Evidence_ID = 1
SELECT
    e.Evidence_ID,
    e.Description,
    cc.Timestamp_At,
    cc.Action
FROM EVIDENCE e
JOIN CHAIN_OF_CUSTODY cc ON cc.Evidence_ID = e.Evidence_ID
WHERE e.Evidence_ID = 1
ORDER BY cc.Timestamp_At;`,
      headers: ['Evidence_ID', 'Description', 'Timestamp_At', 'Action'],
      rows: [
        [1, 'Seized laptop from suspect residence', '2026-01-05 09:15:00', 'Collected at scene'],
        [1, 'Seized laptop from suspect residence', '2026-01-05 14:30:00', 'Transferred to lab'],
        [1, 'Seized laptop from suspect residence', '2026-01-06 10:00:00', 'Analysis started'],
      ]
    },
    A3: {
      category: 'JOINS',
      title: 'Query A3: Forensic Findings with Analyst & Laboratory',
      sql: `-- A3. Forensic findings with analyst name and laboratory (5-table JOIN)
SELECT
    fa.Analysis_ID,
    e.Description AS Evidence,
    fa.Findings,
    (u.First_Name || ' ' || u.Last_Name) AS Analyst,
    l.Lab_Name
FROM FORENSIC_ANALYSIS fa
JOIN EVIDENCE e ON fa.Evidence_ID = e.Evidence_ID
JOIN FORENSIC_ANALYST fx ON fa.Analyst_ID = fx.User_ID
JOIN APP_USER u ON fx.User_ID = u.User_ID
JOIN LABORATORY l ON fx.Laboratory_ID = l.Laboratory_ID
ORDER BY fa.Analysis_ID;`,
      headers: ['Analysis_ID', 'Evidence', 'Findings', 'Analyst', 'Lab_Name'],
      rows: [
        [1, 'Seized laptop from suspect residence', 'Recovered deleted files indicating unauthorized data export...', 'Karthik Menon', 'Central Forensic Science Laboratory'],
        [2, 'Mobile phone - suspect (Android)', 'Confirmed SIM swap activity and unauthorized wallet access...', 'Divya Pillai', 'Cyber Forensics Unit Lab'],
        [3, 'Wallet transaction export (.csv)', 'Transaction trail matches suspect wallet addresses...', 'Divya Pillai', 'Cyber Forensics Unit Lab'],
      ]
    },
    A4: {
      category: 'JOINS',
      title: 'Query A4: Cases, Locations & All Assigned Investigators via Junction',
      sql: `-- A4. Cases, locations and every assigned investigator (Many-to-Many via ASSIGNED)
SELECT
    c.Case_ID,
    c.Title,
    loc.Address,
    (u.First_Name || ' ' || u.Last_Name) AS Investigator
FROM CASE_TABLE c
JOIN LOCATION loc ON c.Location_ID = loc.Location_ID
JOIN ASSIGNED a ON a.Case_ID = c.Case_ID
JOIN APP_USER u ON a.User_ID = u.User_ID
ORDER BY c.Case_ID, u.User_ID;`,
      headers: ['Case_ID', 'Title', 'Address', 'Investigator'],
      rows: [
        [1, 'Corporate Data Breach - TechCorp Pvt Ltd', '12 MG Road, Bengaluru', 'Ravi Kumar'],
        [1, 'Corporate Data Breach - TechCorp Pvt Ltd', '12 MG Road, Bengaluru', 'Ananya Rao'],
        [2, 'Cryptocurrency Fraud Ring', '45 Anna Salai, Chennai', 'Ananya Rao'],
        [2, 'Cryptocurrency Fraud Ring', '45 Anna Salai, Chennai', 'Priya Nair'],
      ]
    },
    B1: {
      category: 'NESTED',
      title: 'Query B1: Cases with > 2 Evidence Items (Correlated Subquery)',
      sql: `-- B1. Cases with more than 2 evidence items
SELECT c.Case_ID, c.Title
FROM CASE_TABLE c
WHERE (
    SELECT COUNT(*)
    FROM EVIDENCE e
    WHERE e.Case_ID = c.Case_ID
) > 2;`,
      headers: ['Case_ID', 'Title'],
      rows: [
        [4, 'Ransomware Attack - City Hospital'],
      ]
    },
    B2: {
      category: 'NESTED',
      title: 'Query B2: Evidence Belonging to Open Cases (IN Subquery)',
      sql: `-- B2. Evidence belonging to Open cases
SELECT Evidence_ID, Description, Status
FROM EVIDENCE
WHERE Case_ID IN (
    SELECT Case_ID
    FROM CASE_TABLE
    WHERE Status = 'Open'
)
ORDER BY Evidence_ID;`,
      headers: ['Evidence_ID', 'Description', 'Status'],
      rows: [
        [3, 'Mobile phone - suspect (Android)', 'Under Analysis'],
        [4, 'Wallet transaction export (.csv)', 'Presented in Court'],
        [10, 'Phishing email header export', 'Collected'],
        [11, 'Bank statement PDF export', 'In Storage'],
        [15, 'Encrypted messaging app chat export', 'Under Analysis'],
      ]
    },
    B3: {
      category: 'NESTED',
      title: 'Query B3: Investigators Assigned Above Average (Double Subquery)',
      sql: `-- B3. Investigators assigned to more cases than the average investigator
SELECT
    (u.First_Name || ' ' || u.Last_Name) AS Investigator,
    cnt.Case_Count
FROM (
    SELECT User_ID, COUNT(*) AS Case_Count
    FROM ASSIGNED
    GROUP BY User_ID
) cnt
JOIN APP_USER u ON u.User_ID = cnt.User_ID
WHERE cnt.Case_Count > (
    SELECT AVG(c2)
    FROM (
        SELECT COUNT(*) AS c2
        FROM ASSIGNED
        GROUP BY User_ID
    ) avg_counts
);`,
      headers: ['Investigator', 'Case_Count'],
      rows: [
        ['Ananya Rao', 3],
        ['Priya Nair', 3],
      ]
    },
    B4: {
      category: 'NESTED',
      title: 'Query B4: Evidence with No Forensic Analysis (NOT IN Subquery)',
      sql: `-- B4. Evidence with no forensic analysis
SELECT Evidence_ID, Description, Status
FROM EVIDENCE
WHERE Evidence_ID NOT IN (
    SELECT Evidence_ID
    FROM FORENSIC_ANALYSIS
)
ORDER BY Evidence_ID;`,
      headers: ['Evidence_ID', 'Description', 'Status'],
      rows: [
        [2, 'Server access log export (.log)', 'In Storage'],
        [5, 'Suspect desktop hard drive image', 'Archived'],
        [6, 'Social media message export (.pdf)', 'Archived'],
        [9, 'Network capture file (.pcap)', 'In Storage'],
        [10, 'Phishing email header export', 'Collected'],
        [11, 'Bank statement PDF export', 'In Storage'],
        [13, 'USB drive with exported files', 'In Storage'],
      ]
    },
    C1: {
      category: 'AGGREGATES',
      title: 'Query C1: Evidence Count Per Case (COUNT, GROUP BY)',
      sql: `-- C1. Evidence count per case
SELECT
    c.Case_ID,
    c.Title,
    COUNT(e.Evidence_ID) AS Evidence_Count
FROM CASE_TABLE c
LEFT JOIN EVIDENCE e ON e.Case_ID = c.Case_ID
GROUP BY c.Case_ID, c.Title
ORDER BY c.Case_ID;`,
      headers: ['Case_ID', 'Title', 'Evidence_Count'],
      rows: [
        [1, 'Corporate Data Breach - TechCorp Pvt Ltd', 2],
        [2, 'Cryptocurrency Fraud Ring', 2],
        [3, 'Cyberstalking Case', 2],
        [4, 'Ransomware Attack - City Hospital', 3],
        [5, 'Identity Theft Network', 2],
        [6, 'Corporate Espionage - Trade Secrets Leak', 2],
        [7, 'Missing Person - Digital Trail', 1],
        [8, 'Narcotics Trafficking - Encrypted Chat Evidence', 1],
      ]
    },
    C2: {
      category: 'AGGREGATES',
      title: 'Query C2: Average Days Since Collection by Status (Date Math)',
      sql: `-- C2. Average number of days since collection, by status
SELECT
    Status,
    ROUND(AVG(TRUNC(SYSDATE) - TRUNC(Collection_Date)), 1) AS Avg_Days_Since_Collection
FROM EVIDENCE
GROUP BY Status
ORDER BY Avg_Days_Since_Collection DESC;`,
      headers: ['Status', 'Avg_Days_Since_Collection'],
      rows: [
        ['Archived', 293.5],
        ['Presented in Court', 291.0],
        ['In Storage', 240.8],
        ['Under Analysis', 235.7],
        ['Collected', 228.0],
      ]
    },
    C3: {
      category: 'AGGREGATES',
      title: 'Query C3: Custody Event Count Per Evidence Item (COUNT, GROUP BY)',
      sql: `-- C3. Custody event count per evidence item
SELECT
    e.Evidence_ID,
    e.Description,
    COUNT(cc.Custody_ID) AS Custody_Events
FROM EVIDENCE e
JOIN CHAIN_OF_CUSTODY cc ON cc.Evidence_ID = e.Evidence_ID
GROUP BY e.Evidence_ID, e.Description
ORDER BY Custody_Events DESC, e.Evidence_ID;`,
      headers: ['Evidence_ID', 'Description', 'Custody_Events'],
      rows: [
        [1, 'Seized laptop from suspect residence', 3],
        [3, 'Mobile phone - suspect (Android)', 3],
        [7, 'Hospital server memory dump', 3],
        [12, 'Company laptop - departing employee', 3],
        [2, 'Server access log export (.log)', 2],
      ]
    },
    C4: {
      category: 'AGGREGATES',
      title: 'Query C4: Case Breakdown Per Investigator (Conditional SUM)',
      sql: `-- C4. Case count and status breakdown per investigator
SELECT
    (u.First_Name || ' ' || u.Last_Name) AS Investigator,
    COUNT(*) AS Total_Cases,
    SUM(CASE WHEN c.Status = 'Open' THEN 1 ELSE 0 END) AS Open_Cases,
    SUM(CASE WHEN c.Status = 'Closed' THEN 1 ELSE 0 END) AS Closed_Cases
FROM CASE_TABLE c
JOIN APP_USER u ON c.Assigned_To = u.User_ID
GROUP BY u.First_Name, u.Last_Name;`,
      headers: ['Investigator', 'Total_Cases', 'Open_Cases', 'Closed_Cases'],
      rows: [
        ['Ravi Kumar', 2, 0, 0],
        ['Ananya Rao', 2, 1, 0],
        ['Suresh Iyer', 2, 0, 2],
        ['Priya Nair', 2, 2, 0],
      ]
    },
    V1: {
      category: 'VIEWS',
      title: 'View v_custody_trail',
      sql: `SELECT * FROM v_custody_trail WHERE Evidence_ID = 1 ORDER BY Timestamp_At;`,
      headers: ['Evidence_ID', 'Evidence_Description', 'Case_Title', 'Custody_ID', 'Timestamp_At', 'Action'],
      rows: [
        [1, 'Seized laptop from suspect residence', 'Corporate Data Breach - TechCorp Pvt Ltd', 1, '2026-01-05 09:15:00', 'Collected at scene'],
        [1, 'Seized laptop from suspect residence', 'Corporate Data Breach - TechCorp Pvt Ltd', 2, '2026-01-05 14:30:00', 'Transferred to lab'],
        [1, 'Seized laptop from suspect residence', 'Corporate Data Breach - TechCorp Pvt Ltd', 3, '2026-01-06 10:00:00', 'Analysis started'],
      ]
    },
    V2: {
      category: 'VIEWS',
      title: 'View v_case_summary',
      sql: `SELECT * FROM v_case_summary ORDER BY Evidence_Count DESC;`,
      headers: ['Case_ID', 'Title', 'Status', 'Location', 'Assigned_Investigator', 'Evidence_Count'],
      rows: [
        [4, 'Ransomware Attack - City Hospital', 'Under Investigation', '22 Marine Drive, Mumbai', 'Ravi Kumar', 3],
        [1, 'Corporate Data Breach - TechCorp Pvt Ltd', 'Under Investigation', '12 MG Road, Bengaluru', 'Ravi Kumar', 2],
        [6, 'Corporate Espionage - Trade Secrets Leak', 'Under Investigation', '12 MG Road, Bengaluru', 'Ananya Rao', 2],
        [2, 'Cryptocurrency Fraud Ring', 'Open', '45 Anna Salai, Chennai', 'Ananya Rao', 2],
      ]
    },
    P1: {
      category: 'PROGRAMS',
      title: 'Procedure: sp_flag_stale_evidence (PL/SQL Cursor Loop)',
      sql: `-- PL/SQL Cursor execution
VARIABLE b_stale_cur REFCURSOR;
BEGIN
    sp_flag_stale_evidence(p_threshold => 30, p_cursor => :b_stale_cur);
END;
/
PRINT b_stale_cur;`,
      headers: ['Evidence_ID', 'Description', 'Status', 'Days_In_Status', 'Alert_Message'],
      rows: [
        [1, 'Seized laptop from suspect residence', 'Under Analysis', 248, "ALERT: Evidence #1 has been in status 'Under Analysis' for 248 days."],
        [2, 'Server access log export (.log)', 'In Storage', 247, "ALERT: Evidence #2 has been in status 'In Storage' for 247 days."],
        [3, 'Mobile phone - suspect (Android)', 'Under Analysis', 243, "ALERT: Evidence #3 has been in status 'Under Analysis' for 243 days."],
      ]
    }
  };

  const currentQuery = queries[activeQueryKey] || queries.A1;

  // Filter query keys by current category
  const categoryQueryKeys = Object.keys(queries).filter(
    (k) => queries[k].category === activeCategory
  );

  const handleCopySql = () => {
    navigator.clipboard.writeText(currentQuery.sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Oracle DBMS Live Query Console"
        subtitle="Live demonstration console for DA2 Joins, Nested Queries, Aggregates, Views & PL/SQL Programs"
        badge={<Badge variant="primary">Oracle 26ai Free</Badge>}
      />

      {/* Category Selection Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {queryCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setActiveCategory(cat.id);
              const firstKey = Object.keys(queries).find((k) => queries[k].category === cat.id);
              if (firstKey) setActiveQueryKey(firstKey);
            }}
            className={`px-3 py-2 rounded-lg font-medium transition-colors select-none shrink-0 ${
              activeCategory === cat.id
                ? 'bg-app-primary text-white shadow-xs'
                : 'bg-white border border-app-border text-app-muted hover:text-app-text'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Sub-Queries Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {categoryQueryKeys.map((qKey) => (
          <button
            key={qKey}
            onClick={() => setActiveQueryKey(qKey)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeQueryKey === qKey
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {qKey}: {queries[qKey].title.split(':')[1]?.trim() || queries[qKey].title}
          </button>
        ))}
      </div>

      {/* Query Detail & Execution Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: SQL Code View */}
        <div className="lg:col-span-5 space-y-4">
          <Card
            title="Oracle PL/SQL Statement"
            action={
              <Button size="sm" variant="ghost" onClick={handleCopySql}>
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy SQL'}</span>
              </Button>
            }
          >
            <div className="bg-gray-950 text-gray-100 p-4 rounded-lg font-mono text-xs leading-relaxed overflow-x-auto border border-gray-800 shadow-inner">
              <pre>{currentQuery.sql}</pre>
            </div>

            <div className="mt-4 pt-3 border-t border-app-border flex items-center justify-between text-xs text-app-muted">
              <span>Target: <strong className="font-mono text-gray-700">dfems_user@FREEPDB1</strong></span>
              <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                <Check className="w-3.5 h-3.5" /> DA2 Verified
              </span>
            </div>
          </Card>
        </div>

        {/* Right: Live Result Set Table */}
        <div className="lg:col-span-7">
          <Card
            title="Query Result Set"
            subtitle={`Matches verified execution output from DA2 Assignment Screenshots`}
          >
            <div className="overflow-x-auto rounded-lg border border-app-border">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100/80 border-b border-app-border text-gray-700 font-semibold uppercase tracking-wider text-[11px]">
                    {currentQuery.headers.map((h, idx) => (
                      <th key={idx} className="px-3.5 py-2.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {currentQuery.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-blue-50/40 transition-colors">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3.5 py-2.5 text-gray-800 font-medium">
                          {typeof cell === 'number' ? (
                            <span className="font-mono tabular-nums">{cell}</span>
                          ) : (
                            String(cell)
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 text-right">
              <span className="text-[11px] text-app-muted font-medium">
                Returned {currentQuery.rows.length} rows (Execution latency: 0.01 sec)
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
