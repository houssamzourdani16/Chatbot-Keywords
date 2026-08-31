// components/admin/google/GoogleSheetsWizard.js
"use client";

import { useState, useEffect, useCallback } from "react";
import GoogleConnectStep from "./GoogleConnectStep";
import SelectSpreadsheetStep from "./SelectSpreadsheetStep";
import SelectSheetStep from "./SelectSheetStep";
import PreviewMapStep from "./PreviewMapStep";

const STEPS = [
  { id: 1, label: "Connect Google Account" },
  { id: 2, label: "Select Spreadsheet" },
  { id: 3, label: "Select Sheet" },
  { id: 4, label: "Preview & Map Columns" },
];

export default function GoogleSheetsWizard({ onComplete, onClose }) {
  const [step, setStep] = useState(1);
  const [connected, setConnected] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [connecting, setConnecting] = useState(false);

  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [spreadsheet, setSpreadsheet] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState(null);

  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [mapping, setMapping] = useState({
    keyword_column: 0,
    category_column: 1,
    metadata_column: -1,
  });

  const getToken = () => localStorage.getItem("accessToken");

  // Check connection status on mount
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/admin/google/status", {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (data.connected) {
          setConnected(true);
          setConnectionInfo(data);
          setAccounts(data.accounts || []);
          if (data.accounts?.length > 0) {
            setSelectedAccountId(data.accounts[0].id);
          }
        }
      } catch (e) {
        // ignore
      }
    }
    checkStatus();
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch("/api/admin/google/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to connect");
      }
    } catch (e) {
      alert("Failed to connect");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (accountId) => {
    try {
      await fetch(`/api/admin/google/status?id=${accountId || ""}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      // Refresh accounts
      const res = await fetch("/api/admin/google/status", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.connected) {
        setAccounts(data.accounts || []);
        setSelectedAccountId(data.accounts?.[0]?.id || "");
      } else {
        setConnected(false);
        setConnectionInfo(null);
        setAccounts([]);
        setSelectedAccountId("");
      }
      setFiles([]);
      setSpreadsheet(null);
      setSheets([]);
      setSelectedSheet(null);
      setPreview(null);
    } catch (e) {
      // ignore
    }
  };

  const handleSelectAccount = (accountId) => {
    setSelectedAccountId(accountId);
    setFiles([]);
    setSpreadsheet(null);
    setSheets([]);
    setSelectedSheet(null);
    setPreview(null);
    loadSpreadsheets(search, accountId);
  };

  const loadSpreadsheets = useCallback(
    async (query = "", accountId = selectedAccountId) => {
      setFilesLoading(true);
      try {
        const res = await fetch(
          `/api/admin/google/spreadsheets?q=${encodeURIComponent(query)}&connectionId=${accountId || ""}`,
          { headers: { Authorization: `Bearer ${getToken()}` } },
        );
        const data = await res.json();
        if (data.success) {
          setFiles(data.files);
        } else {
          alert(data.error || "Failed to load spreadsheets");
        }
      } catch (e) {
        alert("Failed to load spreadsheets");
      } finally {
        setFilesLoading(false);
      }
    },
    [selectedAccountId],
  );

  // Load spreadsheets when entering step 2
  useEffect(() => {
    if (step === 2 && connected) {
      loadSpreadsheets(search, selectedAccountId);
    }
  }, [step, connected, loadSpreadsheets, search, selectedAccountId]);

  const handleSelectSpreadsheet = async (file) => {
    setSpreadsheet(file);
    setSheetsLoading(true);
    setSelectedSheet(null);
    setPreview(null);
    try {
      const res = await fetch(
        `/api/admin/google/spreadsheets/${file.id}/sheets?connectionId=${selectedAccountId || ""}`,
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );
      const data = await res.json();
      if (data.success) {
        setSheets(data.sheets);
      } else {
        alert(data.error || "Failed to load sheets");
      }
    } catch (e) {
      alert("Failed to load sheets");
    } finally {
      setSheetsLoading(false);
    }
  };

  const handleSelectSheet = async (sheet) => {
    setSelectedSheet(sheet);
    setPreviewLoading(true);
    try {
      const res = await fetch(
        `/api/admin/google/spreadsheets/${spreadsheet.id}/preview?sheet=${encodeURIComponent(sheet.title)}&connectionId=${selectedAccountId || ""}`,
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );
      const data = await res.json();
      if (data.success) {
        setPreview(data);
      } else {
        alert(data.error || "Failed to load preview");
      }
    } catch (e) {
      alert("Failed to load preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirm = () => {
    onComplete({
      spreadsheet,
      sheet: selectedSheet,
      preview,
      mapping,
      connectionId: selectedAccountId,
    });
  };

  const goTo = (target) => {
    if (target < step) {
      setStep(target);
    } else if (target === step + 1) {
      setStep(target);
    }
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-[#141B2D] p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          🔗 Google Sheets Integration
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
          ✕
        </button>
      </div>

      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                step === s.id
                  ? "bg-[#6C63FF] text-white"
                  : step > s.id
                    ? "bg-green-500 text-white"
                    : "bg-gray-700 text-gray-400"
              }`}
            >
              {step > s.id ? "✓" : s.id}
            </div>
            <span
              className={`hidden text-xs sm:block ${
                step === s.id ? "text-white" : "text-gray-500"
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 flex-1 ${
                  step > s.id ? "bg-green-500" : "bg-gray-700"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      {step === 1 && (
        <GoogleConnectStep
          connected={connected}
          connectionInfo={connectionInfo}
          accounts={accounts}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onNext={() => goTo(2)}
          connecting={connecting}
        />
      )}

      {step === 2 && (
        <SelectSpreadsheetStep
          files={files}
          loading={filesLoading}
          search={search}
          onSearch={(q) => {
            setSearch(q);
            loadSpreadsheets(q, selectedAccountId);
          }}
          onSelect={handleSelectSpreadsheet}
          selectedId={spreadsheet?.id}
          onBack={() => goTo(1)}
          onNext={() => goTo(3)}
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          onSelectAccount={handleSelectAccount}
        />
      )}

      {step === 3 && (
        <SelectSheetStep
          spreadsheet={spreadsheet}
          sheets={sheets}
          loading={sheetsLoading}
          selectedSheet={selectedSheet}
          onSelect={handleSelectSheet}
          onBack={() => goTo(2)}
          onNext={() => goTo(4)}
        />
      )}

      {step === 4 && (
        <PreviewMapStep
          spreadsheet={spreadsheet}
          sheet={selectedSheet}
          preview={preview}
          loading={previewLoading}
          mapping={mapping}
          onMappingChange={setMapping}
          onBack={() => goTo(3)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}
