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
const customerProfileStorageKey = "docgen.ru.customerProfile.v1";
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
  if (!value) return "не указано";
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("ru-RU");
};

const formatAmount = (value) => {
  const clean = String(value || "").replace(/\s/g, "");
  const amount = Number(clean);
  if (!Number.isFinite(amount)) return value || "не указано";
  return amount.toLocaleString("ru-RU");
};

const getData = () => {
  const data = Object.fromEntries(new FormData(form).entries());
  const contractNumber = data.contractNumber || "без номера";
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

const token = (value) => `<span class="field-token">${value || "заполнить"}</span>`;

const renderContract = (data) => `
  <h3>Договор оказания услуг N ${token(data.contractNumber)}</h3>
  <div class="doc-meta">
    <span>г. Москва</span>
    <span>${formatDate(new Date().toISOString().slice(0, 10))}</span>
  </div>
  <p>
    ${token(data.customerName)}, ИНН ${token(data.customerInn)}, в лице ${token(data.customerSigner)},
    далее "Заказчик", и ${token(data.contractorName)}, ИНН ${token(data.contractorInn)},
    статус: ${token(data.contractorType)}, далее "Исполнитель", заключили настоящий договор.
  </p>
  <p>
    Исполнитель обязуется оказать услуги: ${token(data.serviceDescription)}.
    Период выполнения работ: с ${token(data.startDateFormatted)} по ${token(data.endDateFormatted)}.
  </p>
  <table>
    <tbody>
      <tr><th>Стоимость услуг</th><td>${token(`${data.amountFormatted} руб.`)}</td></tr>
      <tr><th>Условия оплаты</th><td>${token(data.paymentTerms)}</td></tr>
      <tr><th>Связанное приложение</th><td>${token(data.sowNumber)}</td></tr>
      <tr><th>Связанный акт</th><td>${token(data.actNumber)}</td></tr>
    </tbody>
  </table>
  <p class="muted-line">
    Демо показывает принцип: динамические поля выделены цветом, итоговый шаблон настраивается вручную после подтверждения карты полей.
  </p>
`;

const renderSow = (data) => `
  <h3>Приложение N ${token(data.sowNumber)}</h3>
  <p class="muted-line">К договору N ${token(data.contractNumber)}</p>
  <p>
    Заказчик поручает, а Исполнитель принимает к выполнению следующий объем работ:
    ${token(data.serviceDescription)}.
  </p>
  <table>
    <thead>
      <tr><th>Параметр</th><th>Значение</th></tr>
    </thead>
    <tbody>
      <tr><td>Исполнитель</td><td>${token(data.contractorName)}</td></tr>
      <tr><td>Период</td><td>${token(`${data.startDateFormatted} - ${data.endDateFormatted}`)}</td></tr>
      <tr><td>Бюджет</td><td>${token(`${data.amountFormatted} руб.`)}</td></tr>
      <tr><td>Контакт</td><td>${token(data.contractorContact)}</td></tr>
    </tbody>
  </table>
  <p>
    Результат работ передается Заказчику и закрывается актом N ${token(data.actNumber)}.
  </p>
`;

const renderAct = (data) => `
  <h3>Акт оказанных услуг N ${token(data.actNumber)}</h3>
  <p class="muted-line">К договору N ${token(data.contractNumber)} и приложению N ${token(data.sowNumber)}</p>
  <p>
    ${token(data.customerName)} и ${token(data.contractorName)} подтверждают, что услуги оказаны в полном объеме.
  </p>
  <table>
    <tbody>
      <tr><th>Услуга</th><td>${token(data.serviceDescription)}</td></tr>
      <tr><th>Период</th><td>${token(`${data.startDateFormatted} - ${data.endDateFormatted}`)}</td></tr>
      <tr><th>Сумма к оплате</th><td>${token(`${data.amountFormatted} руб.`)}</td></tr>
      <tr><th>Условия оплаты</th><td>${token(data.paymentTerms)}</td></tr>
    </tbody>
  </table>
  <p>
    Претензий по объему и срокам оказания услуг стороны не имеют.
  </p>
`;

const renderers = {
  contract: renderContract,
  sow: renderSow,
  act: renderAct,
};

const tabLabels = {
  contract: "Договор",
  sow: "Приложение",
  act: "Акт",
};

const tabDownloadLabels = {
  contract: "готовый договор",
  sow: "готовое приложение",
  act: "готовый акт",
};

const tabFilePrefixes = {
  contract: "Договор",
  sow: "Приложение",
  act: "Акт",
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
  document.querySelector("#downloadTitle").textContent = `${tabLabels[activeTab]} готов`;
  document.querySelector("#downloadButton").textContent = `Скачать ${tabDownloadLabels[activeTab]}`;
  document.querySelector("#downloadButtonBottom").textContent = `Скачать ${tabDownloadLabels[activeTab]}`;
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
    setCustomerProfileStatus("Сохраненный профиль был поврежден и очищен.");
    return null;
  }
};

const saveCustomerProfile = () => {
  const profile = getCustomerProfile();
  localStorage.setItem(customerProfileStorageKey, JSON.stringify(profile));
  applyCustomerProfile(profile);
  setCustomerProfileStatus("Сохранен профиль:", profile.customerName || "без названия");
  render();
  closeCustomerProfileModal();
  showToast("Профиль заказчика сохранен в этом браузере.");
};

const loadCustomerProfile = () => {
  const profile = getStoredCustomerProfile();
  if (!profile) {
    setCustomerProfileStatus("Профиль заказчика пока не сохранен.");
    return;
  }

  applyCustomerProfile(profile);
  setCustomerProfileStatus("Подставлен сохраненный профиль:", profile.customerName || "без названия");
};

const clearCustomerProfile = () => {
  localStorage.removeItem(customerProfileStorageKey);
  customerProfileForm.reset();
  setCustomerProfileStatus("Профиль заказчика очищен. Текущие поля не изменены.");
  showToast("Сохраненный профиль заказчика очищен.");
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
  formToggleButton.textContent = collapsed ? "Развернуть" : "Свернуть";
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
  showToast(`${tabLabels[activeTab]} скачан. Файл можно открыть в Word или Google Docs.`);
};

const copyChecklist = async () => {
  const text = [
    "Ирина, добрый день! Хочу попробовать генератор документов.",
    "",
    "Для пилота можно прислать:",
    "- типовой договор",
    "- приложение / спецификацию",
    "- акт",
    "- 1-2 обезличенных заполненных примера",
    "- правила нумерации договора, приложений и актов",
    "- список полей, которые обычно меняются",
    "- ограничения по хранению персональных данных",
    "",
    "Telegram: @dphnll",
  ].join("\n");

  try {
    await navigator.clipboard.writeText(text);
    showToast("Список для клиента скопирован.");
  } catch {
    showToast("Не удалось скопировать автоматически. Список есть в документе PROTOTYPE_SCOPE.");
  }
};

const resetForm = () => {
  Object.entries(initialValues).forEach(([name, value]) => {
    const field = form.elements[name];
    if (field) field.value = value;
  });
  activeTab = "contract";
  render();
  showToast("Демо-данные восстановлены.");
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
