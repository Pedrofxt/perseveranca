// Conexão com o Supabase (chave pública: pode ficar no site; a proteção vem das regras RLS do banco)
window.PV_CONFIG = {
  supabaseUrl: "",   // preenchido quando o projeto do Supabase for criado
  supabaseKey: "",
  frequenciaMinima: 75,
  escola: {
    nome: "Centro de Educação Infantil Perseverança",
    curto: "CEI Perseverança",
    endereco: "R. José Antônio Temporão, 169",
    cidade: "Paranaguá – PR",
    cep: "83203-290",
    telefone: "(41) 3425-5968",
    whatsapp: "https://api.whatsapp.com/send?phone=554134255968",
    email: "secretaria@ceiperseveranca.org.br",
    instagram: "https://www.instagram.com/ceiperseveranca/",
    horario: "Segunda a sexta, das 8h às 12h e das 13h às 17h",
    mapa: "https://www.google.com/maps/search/?api=1&query=R.%20Jos%C3%A9%20Ant%C3%B4nio%20Tempor%C3%A3o%2C%20169%2C%20Paranagu%C3%A1%20-%20PR"
  }
};
