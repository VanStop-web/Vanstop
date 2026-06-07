(function () {
    const STORAGE_KEY = "vanstop_driver_settings";
    const DEFAULT_SETTINGS = {
        mercadoPagoConnected: false,
        mercadoPagoAccount: "",
        whatsappNumbers: [
            { label: "Bot Principal", number: "+55 11 99999-0101" }
        ],
        pricingMode: "monthly",
        pricePerKm: "3,50",
        pricePerRoute: "18,00",
        monthlyPrice: "420,00"
    };

    let settings = { ...DEFAULT_SETTINGS };

    // Tradução de snake_case do Supabase para camelCase do front-end
    function mapFromSupabase(dbConfig) {
        if (!dbConfig) return DEFAULT_SETTINGS;
        return {
            mercadoPagoConnected: !!dbConfig.mercado_pago_connected,
            mercadoPagoAccount: dbConfig.mercado_pago_account || "",
            pricingMode: dbConfig.pricing_mode || "monthly",
            pricePerKm: String(dbConfig.price_per_km || "3,50").replace(".", ","),
            pricePerRoute: String(dbConfig.price_per_route || "18,00").replace(".", ","),
            monthlyPrice: String(dbConfig.monthly_price || "420,00").replace(".", ","),
            whatsappNumbers: Array.isArray(dbConfig.whatsapp_numbers) 
                ? dbConfig.whatsapp_numbers 
                : DEFAULT_SETTINGS.whatsappNumbers
        };
    }

    // Tradução de camelCase para snake_case compatível com o Supabase
    function mapToSupabase(localSettings) {
        const parseMoney = (val) => Number(String(val).replace(/\./g, "").replace(",", ".")) || 0;
        return {
            mercado_pago_connected: !!localSettings.mercadoPagoConnected,
            mercado_pago_account: localSettings.mercadoPagoAccount,
            pricing_mode: localSettings.pricingMode,
            price_per_km: parseMoney(localSettings.pricePerKm),
            price_per_route: parseMoney(localSettings.pricePerRoute),
            monthly_price: parseMoney(localSettings.monthlyPrice),
            whatsapp_numbers: localSettings.whatsappNumbers
        };
    }

    async function loadSettings() {
        try {
            // Tenta obter do Supabase se o cliente estiver presente
            if (window.vanStopApi) {
                const dbConfig = await vanStopApi.getConfiguracoes();
                if (dbConfig) {
                    settings = mapFromSupabase(dbConfig);
                    return settings;
                }
            }
        } catch (error) {
            console.warn("Falha ao ler Supabase, tentando cache local:", error);
        }

        // Fallback: LocalStorage
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            settings = saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : { ...DEFAULT_SETTINGS };
        } catch (error) {
            settings = { ...DEFAULT_SETTINGS };
        }
        return settings;
    }

    async function saveSettings(newSettings) {
        settings = { ...newSettings };
        
        // Salva localmente em cache rápido
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (e) {}

        // Salva no Supabase
        try {
            if (window.vanStopApi) {
                const dbPayload = mapToSupabase(settings);
                await vanStopApi.saveConfiguracoes(dbPayload);
            }
        } catch (error) {
            console.error("Falha ao persistir no Supabase:", error);
        }
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function injectModal() {
        if (document.getElementById("vanstop-settings-modal")) return;

        document.body.insertAdjacentHTML("beforeend", `
            <div id="vanstop-settings-modal" class="hidden fixed inset-0 z-[100]">
                <div data-settings-close class="absolute inset-0 bg-black/45 backdrop-blur-sm"></div>
                <section class="absolute inset-x-4 top-6 mx-auto max-w-4xl max-h-[calc(100vh-48px)] overflow-y-auto bg-surface-container-lowest text-on-surface border border-outline-variant rounded-xl shadow-2xl">
                    <header class="sticky top-0 bg-surface-container-lowest border-b border-outline-variant p-5 flex items-start justify-between gap-4 z-10">
                        <div>
                            <div class="flex items-center gap-2 text-primary">
                                <span class="material-symbols-outlined">settings</span>
                                <h2 class="text-xl font-bold">Configurações VanStop</h2>
                            </div>
                            <p class="text-xs text-textMuted mt-1">Conecte pagamentos, números do bot e regras de cobrança da van.</p>
                        </div>
                        <button data-settings-close class="w-10 h-10 rounded-lg border border-outline-variant text-textMain hover:bg-surface-container transition-colors flex items-center justify-center">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </header>

                    <div class="p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <section class="bg-surface border border-outline-variant rounded-xl p-5 space-y-4">
                            <div class="flex items-start justify-between gap-4">
                                <div>
                                    <div class="flex items-center gap-2 text-primary">
                                        <span class="material-symbols-outlined">account_balance_wallet</span>
                                        <h3 class="text-md font-semibold">Mercado Pago</h3>
                                    </div>
                                    <p class="text-xs text-textMuted mt-1">Conta que receberá PIX, boleto e cartão.</p>
                                </div>
                                <span id="mp-status" class="px-3 py-1 rounded-lg text-xs font-bold border"></span>
                            </div>
                            <label class="block">
                                <span class="text-[11px] font-bold text-textMuted uppercase">E-mail ou ID da conta</span>
                                <input id="mp-account-input" class="mt-1 w-full rounded-lg border-outline-variant bg-surface-container-lowest text-textMain text-sm" placeholder="motorista@email.com"/>
                            </label>
                            <button id="mp-connect-button" class="w-full bg-primary text-on-primary rounded-lg py-3 px-4 text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                                <span class="material-symbols-outlined">link</span>
                                Conectar Mercado Pago
                            </button>
                        </section>

                        <section class="bg-surface border border-outline-variant rounded-xl p-5 space-y-4">
                            <div>
                                <div class="flex items-center gap-2 text-primary">
                                    <span class="material-symbols-outlined">smart_toy</span>
                                    <h3 class="text-md font-semibold">Números de WhatsApp do Bot</h3>
                                </div>
                                <p class="text-xs text-textMuted mt-1">Adicione instâncias para cobrança, confirmações e avisos aos pais.</p>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-[1fr_1.2fr_auto] gap-2">
                                <input id="wa-label-input" class="rounded-lg border-outline-variant bg-surface-container-lowest text-textMain text-sm" placeholder="Nome do número"/>
                                <input id="wa-number-input" class="rounded-lg border-outline-variant bg-surface-container-lowest text-textMain text-sm" placeholder="+55 11 99999-9999"/>
                                <button id="wa-add-button" class="bg-primary-container text-on-primary-container rounded-lg px-4 py-2 text-xs font-semibold hover:brightness-110 transition-colors flex items-center justify-center gap-1">
                                    <span class="material-symbols-outlined text-[18px]">add</span>
                                    Adicionar
                                </button>
                            </div>
                            <div id="wa-number-list" class="space-y-2"></div>
                        </section>

                        <section class="lg:col-span-2 bg-surface border border-outline-variant rounded-xl p-5 space-y-4">
                            <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                <div>
                                    <div class="flex items-center gap-2 text-primary">
                                        <span class="material-symbols-outlined">payments</span>
                                        <h3 class="text-md font-semibold">Valores de Cobrança</h3>
                                    </div>
                                    <p class="text-xs text-textMuted mt-1">Escolha se a van cobrará por quilômetro, por rota ou por valor fixo mensal.</p>
                                </div>
                                <div class="grid grid-cols-3 gap-1 bg-surface-container-lowest border border-outline-variant rounded-lg p-1">
                                    <button data-pricing-mode="km" class="pricing-mode-button rounded px-3 py-2 text-[11px] font-semibold">Por Km</button>
                                    <button data-pricing-mode="route" class="pricing-mode-button rounded px-3 py-2 text-[11px] font-semibold">Por rota</button>
                                    <button data-pricing-mode="monthly" class="pricing-mode-button rounded px-3 py-2 text-[11px] font-semibold">Mensal</button>
                                </div>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <label class="block">
                                    <span class="text-[11px] font-bold text-textMuted uppercase">Valor por Km</span>
                                    <div class="mt-1 flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-3">
                                        <span class="text-sm text-textMuted font-medium">R$</span>
                                        <input id="price-km-input" class="w-full border-0 bg-transparent text-textMain text-sm focus:ring-0" placeholder="3,50"/>
                                    </div>
                                </label>
                                <label class="block">
                                    <span class="text-[11px] font-bold text-textMuted uppercase">Valor por Rota</span>
                                    <div class="mt-1 flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-3">
                                        <span class="text-sm text-textMuted font-medium">R$</span>
                                        <input id="price-route-input" class="w-full border-0 bg-transparent text-textMain text-sm focus:ring-0" placeholder="18,00"/>
                                    </div>
                                </label>
                                <label class="block">
                                    <span class="text-[11px] font-bold text-textMuted uppercase">Valor Fixo Mensal</span>
                                    <div class="mt-1 flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-3">
                                        <span class="text-sm text-textMuted font-medium">R$</span>
                                        <input id="price-monthly-input" class="w-full border-0 bg-transparent text-textMain text-sm focus:ring-0" placeholder="420,00"/>
                                    </div>
                                </label>
                            </div>
                            <div id="pricing-preview" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 text-xs text-textMain"></div>
                        </section>
                    </div>

                    <footer class="sticky bottom-0 bg-surface-container-lowest border-t border-outline-variant p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <p id="settings-save-status" class="text-xs text-textMuted">As configurações ficam salvas dinamicamente na nuvem Supabase.</p>
                        <button id="settings-save-button" class="bg-primary text-on-primary rounded-lg px-6 py-3 text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                            <span class="material-symbols-outlined">save</span>
                            Salvar Configurações
                        </button>
                    </footer>
                </section>
            </div>
        `);
    }

    function setPricingMode(localSettings, mode) {
        localSettings.pricingMode = mode;
        document.querySelectorAll(".pricing-mode-button").forEach((button) => {
            const isActive = button.dataset.pricingMode === mode;
            button.classList.toggle("bg-primary", isActive);
            button.classList.toggle("text-on-primary", isActive);
            button.classList.toggle("text-textMain", !isActive);
        });
        updatePricingPreview(localSettings);
    }

    function updatePricingPreview(localSettings) {
        const preview = document.getElementById("pricing-preview");
        if (!preview) return;

        const messages = {
            km: `Modo ativo: cobrança por quilômetro. Valor configurado: R$ ${localSettings.pricePerKm} por km rodado.`,
            route: `Modo ativo: cobrança por rota. Valor configurado: R$ ${localSettings.pricePerRoute} por viagem confirmada.`,
            monthly: `Modo ativo: mensalidade fixa. Valor configurado: R$ ${localSettings.monthlyPrice} por aluno/mês.`
        };
        preview.textContent = messages[localSettings.pricingMode];
    }

    function renderMercadoPago(localSettings) {
        const status = document.getElementById("mp-status");
        const input = document.getElementById("mp-account-input");
        const button = document.getElementById("mp-connect-button");
        if (!status || !input || !button) return;

        input.value = localSettings.mercadoPagoAccount || "";
        status.textContent = localSettings.mercadoPagoConnected ? "Conectado" : "Pendente";
        status.className = localSettings.mercadoPagoConnected
            ? "px-3 py-1 rounded-lg text-xs font-bold border bg-primary/20 text-signal border-primary/25"
            : "px-3 py-1 rounded-lg text-xs font-bold border bg-surface-container-lowest text-textMuted border-outline-variant";
        button.innerHTML = localSettings.mercadoPagoConnected
            ? '<span class="material-symbols-outlined">verified</span> Mercado Pago Conectado'
            : '<span class="material-symbols-outlined">link</span> Conectar Mercado Pago';
    }

    function renderWhatsappNumbers(localSettings) {
        const list = document.getElementById("wa-number-list");
        if (!list) return;

        if (!localSettings.whatsappNumbers.length) {
            list.innerHTML = '<div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 text-xs text-textMuted">Nenhum número adicionado ainda.</div>';
            return;
        }

        list.innerHTML = localSettings.whatsappNumbers.map((item, index) => `
            <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex items-center justify-between gap-4">
                <div>
                    <p class="text-xs font-semibold text-textMain">${escapeHtml(item.label)}</p>
                    <p class="text-xs text-textMuted mt-1">${escapeHtml(item.number)}</p>
                </div>
                <button data-remove-wa="${index}" class="w-8 h-8 rounded-lg border border-outline-variant text-error hover:bg-error-container hover:border-transparent transition-colors flex items-center justify-center">
                    <span class="material-symbols-outlined text-[16px]">delete</span>
                </button>
            </div>
        `).join("");
    }

    function fillForm(localSettings) {
        renderMercadoPago(localSettings);
        renderWhatsappNumbers(localSettings);
        document.getElementById("price-km-input").value = localSettings.pricePerKm;
        document.getElementById("price-route-input").value = localSettings.pricePerRoute;
        document.getElementById("price-monthly-input").value = localSettings.monthlyPrice;
        setPricingMode(localSettings, localSettings.pricingMode);
    }

    function readForm(localSettings) {
        localSettings.mercadoPagoAccount = document.getElementById("mp-account-input").value.trim();
        localSettings.pricePerKm = document.getElementById("price-km-input").value.trim() || DEFAULT_SETTINGS.pricePerKm;
        localSettings.pricePerRoute = document.getElementById("price-route-input").value.trim() || DEFAULT_SETTINGS.pricePerRoute;
        localSettings.monthlyPrice = document.getElementById("price-monthly-input").value.trim() || DEFAULT_SETTINGS.monthlyPrice;
        return localSettings;
    }

    function openModal(localSettings) {
        fillForm(localSettings);
        document.getElementById("vanstop-settings-modal").classList.remove("hidden");
        document.body.classList.add("overflow-hidden");
    }

    function closeModal() {
        const modal = document.getElementById("vanstop-settings-modal");
        if (modal) modal.classList.add("hidden");
        document.body.classList.remove("overflow-hidden");
    }

    // Inicialização principal
    const init = async () => {
        injectModal();
        const activeSettings = await loadSettings();

        // Vincula abertura de modal a partir de elementos que tenham o texto "Configurações"
        document.querySelectorAll("a, button").forEach((trigger) => {
            if (trigger.closest("#vanstop-settings-modal")) return;
            if (trigger.textContent && trigger.textContent.trim().includes("Configurações")) {
                trigger.addEventListener("click", (event) => {
                    event.preventDefault();
                    openModal(activeSettings);
                });
            }
        });

        // Evento customizado para abrir a partir do index.html
        window.addEventListener("open-vanstop-settings", (event) => {
            event.preventDefault();
            openModal(activeSettings);
        });

        document.querySelectorAll("[data-settings-close]").forEach((closeButton) => {
            closeButton.addEventListener("click", closeModal);
        });

        document.getElementById("mp-connect-button").addEventListener("click", async () => {
            activeSettings.mercadoPagoAccount = document.getElementById("mp-account-input").value.trim();
            activeSettings.mercadoPagoConnected = true;
            renderMercadoPago(activeSettings);
            await saveSettings(readForm(activeSettings));
            document.getElementById("settings-save-status").textContent = "Mercado Pago conectado e sincronizado na nuvem.";
        });

        document.getElementById("wa-add-button").addEventListener("click", async () => {
            const labelInput = document.getElementById("wa-label-input");
            const numberInput = document.getElementById("wa-number-input");
            const label = labelInput.value.trim() || "Novo Bot";
            const number = numberInput.value.trim();
            if (!number) return;

            activeSettings.whatsappNumbers.push({ label, number });
            labelInput.value = "";
            numberInput.value = "";
            renderWhatsappNumbers(activeSettings);
            await saveSettings(readForm(activeSettings));
        });

        document.getElementById("wa-number-list").addEventListener("click", async (event) => {
            const removeButton = event.target.closest("[data-remove-wa]");
            if (!removeButton) return;

            activeSettings.whatsappNumbers.splice(Number(removeButton.dataset.removeWa), 1);
            renderWhatsappNumbers(activeSettings);
            await saveSettings(readForm(activeSettings));
        });

        document.querySelectorAll(".pricing-mode-button").forEach((button) => {
            button.addEventListener("click", async () => {
                readForm(activeSettings);
                setPricingMode(activeSettings, button.dataset.pricingMode);
                await saveSettings(activeSettings);
            });
        });

        ["price-km-input", "price-route-input", "price-monthly-input"].forEach((id) => {
            document.getElementById(id).addEventListener("input", () => {
                readForm(activeSettings);
                updatePricingPreview(activeSettings);
            });
        });

        document.getElementById("settings-save-button").addEventListener("click", async () => {
            const statusEl = document.getElementById("settings-save-status");
            statusEl.textContent = "Salvando no Supabase...";
            await saveSettings(readForm(activeSettings));
            statusEl.textContent = "Configurações salvas e sincronizadas na nuvem.";
            
            // Recarrega a página após fechar para refletir novos preços e conexões nos painéis
            setTimeout(() => {
                closeModal();
                window.location.reload();
            }, 800);
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") closeModal();
        });
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
