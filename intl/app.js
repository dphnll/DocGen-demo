const form = document.querySelector("#docForm");
const preview = document.querySelector("#documentPreview");
const zoomedPreview = document.querySelector("#zoomedPreview");
const previewModal = document.querySelector("#previewModal");
const previewModalTitle = document.querySelector("#previewModalTitle");
const customerProfileModal = document.querySelector("#customerProfileModal");
const customerProfileForm = document.querySelector("#customerProfileForm");
const formPanel = document.querySelector(".form-panel");
const formToggleButton = document.querySelector("#formToggleButton");
const tabs = [...document.querySelectorAll(".tab")];
const packageItems = [...document.querySelectorAll(".package-item")];
const toast = document.querySelector("#toast");
const customerProfileStatus = document.querySelector("#customerProfileStatus");
const customerProfileStatusLabel = customerProfileStatus.querySelector(".profile-status-label");
const customerProfileStatusCompany = customerProfileStatus.querySelector(".profile-status-company");

let activeTab = "contract";
let toastTimer;

const initialValues = Object.fromEntries(new FormData(form).entries());
const customerProfileStorageKey = "docgen.intl.customerProfile.v1";
const customerProfileFields = [
  "customerName",
  "customerInn",
  "customerOgrn",
  "customerAddress",
  "customerSigner",
  "customerSignerRole",
  "customerSignerBasis",
  "customerContact",
  "customerBankDetails",
];
const customerProfileDocumentFields = ["customerName", "customerInn", "customerAddress", "customerSigner"];

const formatDate = (value) => {
  if (!value) return "not specified";
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-GB");
};

const formatAmount = (value) => {
  const clean = String(value || "").replace(/\s/g, "");
  const amount = Number(clean);
  if (!Number.isFinite(amount)) return value || "not specified";
  return amount.toLocaleString("en-US");
};

const getData = () => {
  const data = Object.fromEntries(new FormData(form).entries());
  const contractNumber = data.contractNumber || "no-number";
  return {
    ...data,
    contractNumber,
    sowNumber: `${contractNumber}-${data.sowSuffix || "01"}`,
    actNumber: `${contractNumber}-${data.actSuffix || "A1"}`,
    amountFormatted: formatAmount(data.amount),
    startDateFormatted: formatDate(data.startDate),
    endDateFormatted: formatDate(data.endDate),
  };
};

const token = (value) => `<span class="field-token">${value || "fill in"}</span>`;

const renderContract = (data) => `
  <h3>Service Agreement No. ${token(data.contractNumber)}</h3>
  <div class="doc-meta">
    <span>Berlin</span>
    <span>${formatDate(new Date().toISOString().slice(0, 10))}</span>
  </div>
  <p>
    ${token(data.customerName)}, Tax ID / registration no. ${token(data.customerInn)}, represented by ${token(data.customerSigner)},
    hereinafter the "Company", and ${token(data.contractorName)}, Tax ID / registration no. ${token(data.contractorInn)},
    status: ${token(data.contractorType)}, hereinafter the "Contractor", enter into this agreement.
  </p>
  <p>
    The Contractor shall provide the following services: ${token(data.serviceDescription)}.
    Service period: from ${token(data.startDateFormatted)} to ${token(data.endDateFormatted)}.
  </p>
  <table>
    <tbody>
      <tr><th>Service fee</th><td>${token(`EUR ${data.amountFormatted}`)}</td></tr>
      <tr><th>Payment terms</th><td>${token(data.paymentTerms)}</td></tr>
      <tr><th>Linked appendix / SOW</th><td>${token(data.sowNumber)}</td></tr>
      <tr><th>Linked closing document</th><td>${token(data.actNumber)}</td></tr>
    </tbody>
  </table>
  <p class="muted-line">
    The prototype shows the principle: dynamic fields are highlighted, and the final template is configured manually after the field map is confirmed.
  </p>
`;

const renderSow = (data) => `
  <h3>Appendix / Statement of Work No. ${token(data.sowNumber)}</h3>
  <p class="muted-line">Linked to Agreement No. ${token(data.contractNumber)}</p>
  <p>
    The Company requests, and the Contractor accepts, the following scope of work:
    ${token(data.serviceDescription)}.
  </p>
  <table>
    <thead>
      <tr><th>Parameter</th><th>Value</th></tr>
    </thead>
    <tbody>
      <tr><td>Contractor</td><td>${token(data.contractorName)}</td></tr>
      <tr><td>Period</td><td>${token(`${data.startDateFormatted} - ${data.endDateFormatted}`)}</td></tr>
      <tr><td>Budget</td><td>${token(`EUR ${data.amountFormatted}`)}</td></tr>
      <tr><td>Contact</td><td>${token(data.contractorContact)}</td></tr>
    </tbody>
  </table>
  <p>
    The work result is delivered to the Company and closed with document No. ${token(data.actNumber)}.
  </p>
`;

const renderAct = (data) => `
  <h3>Closing / Acceptance Document No. ${token(data.actNumber)}</h3>
  <p class="muted-line">Linked to Agreement No. ${token(data.contractNumber)} and Appendix / SOW No. ${token(data.sowNumber)}</p>
  <p>
    ${token(data.customerName)} and ${token(data.contractorName)} confirm that the services have been provided in full.
  </p>
  <table>
    <tbody>
      <tr><th>Service</th><td>${token(data.serviceDescription)}</td></tr>
      <tr><th>Period</th><td>${token(`${data.startDateFormatted} - ${data.endDateFormatted}`)}</td></tr>
      <tr><th>Amount due</th><td>${token(`EUR ${data.amountFormatted}`)}</td></tr>
      <tr><th>Payment terms</th><td>${token(data.paymentTerms)}</td></tr>
    </tbody>
  </table>
  <p>
    The parties have no claims regarding the scope or timing of the services.
  </p>
`;

const renderers = {
  contract: renderContract,
  sow: renderSow,
  act: renderAct,
};

const tabLabels = {
  contract: "Contract",
  sow: "Appendix / SOW",
  act: "Closing document",
};

const tabDownloadLabels = {
  contract: "ready contract",
  sow: "ready appendix / SOW",
  act: "ready closing document",
};

const tabFilePrefixes = {
  contract: "Contract",
  sow: "Appendix-SOW",
  act: "Closing-document",
};

const getActiveDocumentNumber = (data) => {
  if (activeTab === "sow") return data.sowNumber;
  if (activeTab === "act") return data.actNumber;
  return data.contractNumber;
};

const sanitizeFileName = (value) => {
  return String(value || "document")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .trim();
};

const updateActiveControls = () => {
  [...tabs, ...packageItems].forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === activeTab);
  });
};

const render = () => {
  const data = getData();
  document.querySelector("#contractNumberView").textContent = data.contractNumber;
  document.querySelector("#sowNumberView").textContent = data.sowNumber;
  document.querySelector("#actNumberView").textContent = data.actNumber;
  document.querySelector("#navContractNumber").textContent = data.contractNumber;
  document.querySelector("#navSowNumber").textContent = data.sowNumber;
  document.querySelector("#navActNumber").textContent = data.actNumber;
  document.querySelector("#downloadTitle").textContent = `${tabLabels[activeTab]} is ready`;
  document.querySelector("#downloadButton").textContent = `Download ${tabDownloadLabels[activeTab]}`;
  document.querySelector("#downloadButtonBottom").textContent = `Download ${tabDownloadLabels[activeTab]}`;
  preview.innerHTML = renderers[activeTab](data);
  zoomedPreview.innerHTML = preview.innerHTML;
  previewModalTitle.textContent = tabLabels[activeTab];
  updateActiveControls();
};

const showToast = (message) => {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("visible");
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 3000);
};

const setCustomerProfileStatus = (message, companyName = "") => {
  customerProfileStatusLabel.textContent = message;
  customerProfileStatusCompany.textContent = companyName;
};

const getCustomerProfile = () => {
  return customerProfileFields.reduce((profile, fieldName) => {
    const profileField = customerProfileForm.elements[fieldName];
    profile[fieldName] = profileField ? profileField.value : form.elements[fieldName]?.value || "";
    return profile;
  }, {});
};

const applyCustomerProfile = (profile) => {
  customerProfileFields.forEach((fieldName) => {
    const profileField = customerProfileForm.elements[fieldName];
    if (profileField) {
      profileField.value = typeof profile[fieldName] === "string" ? profile[fieldName] : "";
    }
  });

  customerProfileDocumentFields.forEach((fieldName) => {
    const field = form.elements[fieldName];
    if (field && typeof profile[fieldName] === "string") {
      field.value = profile[fieldName];
    }
  });
};

const getStoredCustomerProfile = () => {
  const rawProfile = localStorage.getItem(customerProfileStorageKey);
  if (!rawProfile) return null;

  try {
    return JSON.parse(rawProfile);
  } catch {
    localStorage.removeItem(customerProfileStorageKey);
    setCustomerProfileStatus("Saved profile was damaged and cleared.");
    return null;
  }
};

const saveCustomerProfile = () => {
  const profile = getCustomerProfile();
  localStorage.setItem(customerProfileStorageKey, JSON.stringify(profile));
  applyCustomerProfile(profile);
  setCustomerProfileStatus("Saved profile:", profile.customerName || "unnamed");
  render();
  closeCustomerProfileModal();
  showToast("Company profile is saved in this browser.");
};

const loadCustomerProfile = () => {
  const profile = getStoredCustomerProfile();
  if (!profile) {
    setCustomerProfileStatus("Company profile is not saved yet.");
    return;
  }

  applyCustomerProfile(profile);
  setCustomerProfileStatus("Loaded saved profile:", profile.customerName || "unnamed");
};

const clearCustomerProfile = () => {
  localStorage.removeItem(customerProfileStorageKey);
  customerProfileForm.reset();
  setCustomerProfileStatus("Company profile cleared. Current fields were not changed.");
  showToast("Saved company profile was cleared.");
};

const resetCustomerProfileDraft = () => {
  customerProfileForm.reset();
  customerProfileFields.forEach((fieldName) => {
    const field = customerProfileForm.elements[fieldName];
    if (field) field.value = "";
  });
};

const openCustomerProfileModal = () => {
  const storedProfile = getStoredCustomerProfile();
  if (storedProfile) {
    applyCustomerProfile(storedProfile);
  } else {
    resetCustomerProfileDraft();
    const currentProfile = customerProfileDocumentFields.reduce((profile, fieldName) => {
      profile[fieldName] = form.elements[fieldName]?.value || "";
      return profile;
    }, {});
    applyCustomerProfile(currentProfile);
  }

  customerProfileModal.classList.add("open");
  customerProfileModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
};

const closeCustomerProfileModal = () => {
  customerProfileModal.classList.remove("open");
  customerProfileModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
};

const setFormCollapsed = (collapsed) => {
  formPanel.classList.toggle("form-collapsed", collapsed);
  formToggleButton.textContent = collapsed ? "Expand" : "Collapse";
  formToggleButton.setAttribute("aria-expanded", String(!collapsed));
};

const toggleFormPanel = () => {
  setFormCollapsed(!formPanel.classList.contains("form-collapsed"));
};

const initializeResponsiveFormState = () => {
  setFormCollapsed(window.matchMedia("(max-width: 760px)").matches);
};

const downloadPreview = () => {
  const data = getData();
  const documentNumber = getActiveDocumentNumber(data);
  const fileName = sanitizeFileName(`${tabFilePrefixes[activeTab]}_${documentNumber}`);
  const html = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <title>${tabLabels[activeTab]} ${documentNumber}</title>
    <style>
      body {
        max-width: 760px;
        margin: 40px auto;
        color: #2b2c2a;
        font-family: "Times New Roman", Times, serif;
        font-size: 14pt;
        line-height: 1.55;
      }
      h3 {
        text-align: center;
        font-size: 18pt;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 18px 0;
      }
      th,
      td {
        border: 1px solid #deded8;
        padding: 8px;
        text-align: left;
        vertical-align: top;
      }
      .doc-meta {
        display: flex;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 24px;
      }
      .field-token {
        background: #f5f0e4;
        padding: 1px 4px;
        font-weight: 700;
      }
      .muted-line {
        color: #6f706d;
      }
    </style>
  </head>
  <body>${preview.innerHTML}</body>
</html>`;
  const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast(`${tabLabels[activeTab]} downloaded. You can open the file in Word or Google Docs.`);
};

const copyChecklist = async () => {
  const text = [
    "Hi Irina! I would like to try the document generator.",
    "",
    "For a pilot, I can send:",
    "- a typical contract",
    "- an appendix / SOW / specification",
    "- an invoice / acceptance / closing document",
    "- 1-2 anonymized filled examples",
    "- numbering rules for the document package",
    "- a list of fields that usually change",
    "- privacy / compliance restrictions for personal data",
    "",
    "Telegram: @dphnll",
  ].join("\n");

  try {
    await navigator.clipboard.writeText(text);
    showToast("Pilot checklist copied.");
  } catch {
    showToast("Could not copy automatically. The checklist is documented in PROTOTYPE_SCOPE.");
  }
};

const resetForm = () => {
  Object.entries(initialValues).forEach(([name, value]) => {
    const field = form.elements[name];
    if (field) field.value = value;
  });
  activeTab = "contract";
  render();
  showToast("Demo data restored.");
};

const openZoom = () => {
  zoomedPreview.innerHTML = preview.innerHTML;
  previewModalTitle.textContent = tabLabels[activeTab];
  previewModal.classList.add("open");
  previewModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
};

const closeZoom = () => {
  previewModal.classList.remove("open");
  previewModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
};

form.addEventListener("input", render);
form.addEventListener("change", render);

[...tabs, ...packageItems].forEach((button) => {
  button.addEventListener("click", () => {
    activeTab = button.dataset.tab;
    render();
  });
});

document.querySelector("#downloadButton").addEventListener("click", downloadPreview);
document.querySelector("#downloadButtonBottom").addEventListener("click", downloadPreview);
document.querySelector("#zoomButton").addEventListener("click", openZoom);
document.querySelector("#closeZoomButton").addEventListener("click", closeZoom);
document.querySelector("#previewModalBackdrop").addEventListener("click", closeZoom);
document.querySelector("#copyChecklistButton").addEventListener("click", copyChecklist);
document.querySelector("#resetButton").addEventListener("click", resetForm);
formToggleButton.addEventListener("click", toggleFormPanel);
document.querySelector("#openCustomerProfileButton").addEventListener("click", openCustomerProfileModal);
document.querySelector("#closeCustomerProfileButton").addEventListener("click", closeCustomerProfileModal);
document.querySelector("#customerProfileBackdrop").addEventListener("click", closeCustomerProfileModal);
document.querySelector("#saveCustomerProfileButton").addEventListener("click", saveCustomerProfile);
document.querySelector("#clearCustomerProfileButton").addEventListener("click", clearCustomerProfile);
document.querySelector("#newCustomerProfileButton").addEventListener("click", resetCustomerProfileDraft);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && previewModal.classList.contains("open")) {
    closeZoom();
  }
  if (event.key === "Escape" && customerProfileModal.classList.contains("open")) {
    closeCustomerProfileModal();
  }
});

loadCustomerProfile();
initializeResponsiveFormState();
render();
