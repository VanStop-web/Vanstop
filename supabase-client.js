// supabase-client.js
// Cliente de conexão e comunicação do VanStop com o Supabase

const SUPABASE_URL = "https://mfgckaxtfxduaqabtnzc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mZ2NrYXh0ZnhkdWFxYWJ0bnpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5ODk3MTgsImV4cCI6MjA5NTU2NTcxOH0.5cjDkqLQ-mLnNFB8mhPdKt1TSzSizwMX-Bf-y6Xwbek";

// Carregar script do Supabase dinamicamente se necessário
function loadSupabaseScript() {
    return new Promise((resolve, reject) => {
        if (window.supabase) {
            resolve(window.supabase);
            return;
        }
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
        script.onload = () => resolve(window.supabase);
        script.onerror = (err) => reject(err);
        document.head.appendChild(script);
    });
}

// Instância única do cliente Supabase
const supabaseInstancePromise = loadSupabaseScript().then((sb) => {
    return sb.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
});

async function getSupabase() {
    return await supabaseInstancePromise;
}

// API de alto nível exportada globalmente para o VanStop
window.vanStopApi = {
    // Retorna todos os alunos com os dados de seus responsáveis
    async getAlunos() {
        const client = await getSupabase();
        const { data, error } = await client
            .from("alunos")
            .select("*, responsaveis(*)")
            .order("nome", { ascending: true });
        if (error) {
            console.error("Erro ao buscar alunos:", error);
            throw error;
        }
        return data;
    },

    // Atualiza o status do aluno (ex: ativo, inativo, suspenso)
    async updateAlunoStatus(id, status) {
        const client = await getSupabase();
        const { data, error } = await client
            .from("alunos")
            .update({ status })
            .eq("id", id)
            .select();
        if (error) throw error;
        return data;
    },

    // Retorna todas as solicitações pendentes de triagem
    async getSolicitacoes() {
        const client = await getSupabase();
        const { data, error } = await client
            .from("solicitacoes")
            .select("*")
            .order("created_at", { ascending: false });
        if (error) {
            console.error("Erro ao buscar solicitações:", error);
            throw error;
        }
        return data;
    },

    // Atualiza o status da solicitação
    async updateSolicitacaoStatus(id, status) {
        const client = await getSupabase();
        const { data, error } = await client
            .from("solicitacoes")
            .update({ status })
            .eq("id", id)
            .select();
        if (error) throw error;
        return data;
    },

    // Aprova a solicitação: cria o responsável, cria o aluno e atualiza o status da triagem
    async approveSolicitacao(solicitacao) {
        const client = await getSupabase();

        // 1. Cria ou insere o Responsável
        const { data: respData, error: respError } = await client
            .from("responsaveis")
            .insert({
                nome: solicitacao.nome_responsavel,
                cpf: solicitacao.cpf_responsavel,
                telefone: solicitacao.telefone_responsavel
            })
            .select()
            .single();

        if (respError) throw respError;

        // 2. Cria o Aluno
        const { data: alunoData, error: alunoError } = await client
            .from("alunos")
            .insert({
                nome: solicitacao.nome_aluno,
                responsavel_id: respData.id,
                escola: solicitacao.escola,
                endereco_casa: solicitacao.endereco_embarque,
                lat: solicitacao.lat,
                lng: solicitacao.lng,
                status: "ativo"
            })
            .select()
            .single();

        if (alunoError) throw alunoError;

        // 3. Atualiza o status da triagem
        await this.updateSolicitacaoStatus(solicitacao.id, "aprovada");

        // 4. Cria a primeira mensalidade de teste se necessário
        const mesAtual = new Date().toISOString().substring(0, 7); // Ex: '2026-05'
        const vencimento = new Date();
        vencimento.setDate(10);
        if (vencimento < new Date()) vencimento.setMonth(vencimento.getMonth() + 1);

        await client.from("mensalidades").insert({
            aluno_id: alunoData.id,
            mes_referencia: mesAtual,
            valor: 420.00,
            status: "pendente",
            data_vencimento: vencimento.toISOString().substring(0, 10)
        });

        return { responsavel: respData, aluno: alunoData };
    },

    // Retorna as configurações do app
    async getConfiguracoes() {
        const client = await getSupabase();
        const { data, error } = await client
            .from("configuracoes")
            .select("*")
            .eq("id", 1)
            .single();
        if (error) {
            console.error("Erro ao buscar configurações:", error);
            throw error;
        }
        return data;
    },

    // Salva as configurações no banco
    async saveConfiguracoes(config) {
        const client = await getSupabase();
        const { data, error } = await client
            .from("configuracoes")
            .upsert({
                id: 1,
                ...config,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // Retorna todo o histórico de mensalidades/faturamento
    async getMensalidades() {
        const client = await getSupabase();
        const { data, error } = await client
            .from("mensalidades")
            .select("*, alunos(*, responsaveis(*))")
            .order("data_vencimento", { ascending: false });
        if (error) {
            console.error("Erro ao buscar mensalidades:", error);
            throw error;
        }
        return data;
    },

    // Altera o status da mensalidade (baixa ou inadimplência)
    async updateMensalidadeStatus(id, status, dataPagamento = null) {
        const client = await getSupabase();
        const updateData = { status };
        if (status === "pago") {
            updateData.data_pagamento = dataPagamento || new Date().toISOString();
        } else {
            updateData.data_pagamento = null;
        }

        const { data, error } = await client
            .from("mensalidades")
            .update(updateData)
            .eq("id", id)
            .select();
        if (error) throw error;
        return data;
    },

    // Retorna a localização geográfica em tempo real da van
    async getLocalizacaoVan(vanIdentifier = "Van 402-A") {
        const client = await getSupabase();
        const { data, error } = await client
            .from("localizacao_van")
            .select("*")
            .eq("van_identifier", vanIdentifier)
            .maybeSingle();
        if (error) throw error;
        return data;
    },

    // Atualiza as coordenadas em tempo real do GPS da van
    async updateLocalizacaoVan(lat, lng, vanIdentifier = "Van 402-A") {
        const client = await getSupabase();
        const { data, error } = await client
            .from("localizacao_van")
            .upsert({
                van_identifier: vanIdentifier,
                lat,
                lng,
                updated_at: new Date().toISOString()
            }, { onConflict: "van_identifier" })
            .select()
            .single();
        if (error) throw error;
        return data;
    }
};
