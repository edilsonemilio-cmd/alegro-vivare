/* Alegro Vivare — dados iniciais (equipe do eSenior + regras) */
window.AV_SEED = {
  instituicao: "Alegro Vivare",
  unidades: [
    { id: "courupita", nome: "Courupita", endereco: "Rua Courupita, 1334 — Eldorado", foto: "img/casa-courupita.jpg" },
    { id: "iretama", nome: "Iretama", endereco: "Rua Iretama, 449 — Novo Eldorado", foto: "img/casa-iretama.jpg" },
    { id: "tinguassu", nome: "Tinguassu", endereco: "Rua Tinguassu, 1030", foto: "img/casa-tinguassu.jpg" }
  ],
  vagasDia: 2,
  vagasNoite: 2,
  vagasNoiteIretama: 1,
  senhaPadrao: "Alegro123",
  sindicato: {
    nome: "SEESS — Sindicato dos Empregados em Estabelecimentos de Serviços de Saúde",
    fone: "(31) 3351-8241",
    site: "https://www.seess.com.br/beneficios",
    instagram: "https://www.instagram.com/sindicatosaude"
  },
  beneficios: [
    { id: "praia", nome: "Hospedagem na praia", cat: "Lazer", foto: "img/bene-praia.jpg", desc: "Pousadas com condição de associado. Arraial d’Ajuda/BA, opções para família.", url: "https://sindicato.api.br/pousadas/trabalhador/vagas.php?token=Y29kY2xpPTI=", cta: "Ver vagas" },
    { id: "luz", nome: "Desconto na conta de luz", cat: "Economia", foto: "img/bene-luz.jpg", desc: "Até 10% na energia (CEMIG, Energiza, EDP). Serve para você, familiar ou amigo titular da conta. Sem fidelidade.", url: "https://www.trabalhadoresdasaude.com.br/cemig", cta: "Pedir desconto" },
    { id: "odonto", nome: "Convênio odontológico", cat: "Saúde", foto: "img/bene-odonto.jpg", desc: "Consulta, limpeza, prevenção e vários procedimentos sem honorários. Estética com desconto. Vale para dependentes.", url: "https://www.seess.com.br/odonto_sindicato", cta: "Ver o plano" },
    { id: "edu", nome: "Descontos em educação", cat: "Estudo", foto: "img/bene-edu.jpg", desc: "Condição especial em graduação, pós e EAD parceiros do sindicato.", url: "https://www.seess.com.br/beneficios", cta: "Ver no site" }
  ],
  loja: [
    { id: "chuva", nome: "Guarda-chuva", custo: 50000, teto: 40, foto: "img/loja-chuva.jpg", desc: "≈ 33 plantões de R$ 150" },
    { id: "necessaire", nome: "Necessaire", custo: 55000, teto: 45, foto: "img/loja-necessaire.jpg", desc: "≈ 37 plantões" },
    { id: "ifood", nome: "Vale iFood", custo: 55000, teto: 40, foto: "img/loja-ifood.jpg", desc: "≈ 37 plantões" },
    { id: "garrafa", nome: "Garrafa com vedação", custo: 60000, teto: 50, foto: "img/loja-garrafa.jpg", desc: "≈ 40 plantões" },
    { id: "cinema", nome: "Ingresso de cinema", custo: 60000, teto: 50, foto: "img/loja-cinema.jpg", desc: "≈ 40 plantões" },
    { id: "kit", nome: "Kit cuidados pessoais", custo: 70000, teto: 55, foto: "img/loja-kit.jpg", desc: "≈ 47 plantões" },
    { id: "vale50", nome: "Vale-presente R$ 50", custo: 70000, teto: 50, foto: "img/loja-vale.jpg", desc: "≈ 47 plantões" },
    { id: "almofada", nome: "Almofada de descanso", custo: 80000, teto: 70, foto: "img/loja-almofada.jpg", desc: "≈ 53 plantões" },
    { id: "bolsa", nome: "Bolsa térmica", custo: 95000, teto: 80, foto: "img/loja-bolsa.jpg", desc: "≈ 63 plantões" },
    { id: "power", nome: "Carregador portátil", custo: 120000, teto: 120, foto: "img/loja-power.jpg", desc: "≈ 80 plantões" },
    { id: "fone", nome: "Fone de ouvido", custo: 140000, teto: 150, foto: "img/loja-fone.jpg", desc: "≈ 93 plantões" },
    { id: "vale100", nome: "Vale-presente R$ 100", custo: 140000, teto: 100, foto: "img/loja-vale.jpg", desc: "≈ 93 plantões" },
    { id: "mochila", nome: "Mochila", custo: 190000, teto: 180, foto: "img/loja-mochila.jpg", desc: "≈ 127 plantões" },
    { id: "vale150", nome: "Vale-presente R$ 150", custo: 210000, teto: 150, foto: "img/loja-vale.jpg", desc: "≈ 140 plantões" },
    { id: "sanduicheira", nome: "Sanduicheira", custo: 220000, teto: 180, foto: "img/loja-sanduicheira.jpg", desc: "≈ 147 plantões" },
    { id: "cafeteira", nome: "Cafeteira", custo: 250000, teto: 200, foto: "img/loja-cafeteira.jpg", desc: "≈ 167 plantões" },
    { id: "folga", nome: "Folga premiada", custo: 280000, teto: 200, foto: "img/logo.png", desc: "≈ 187 plantões · só quem segura a casa" }
  ],
  usuarios: [
    { id: "u-edilson", nome: "Edilson Emilio Alves", email: "alegrovivare@gmail.com", papel: "admin", vinculo: "fixo", unidade: "tinguassu", turno: null, cargo: "Gerontólogo", coordena: false, loja: true }
  ],
  equipeEssenior: [
    "Marcus Vinicius Nogueira Vieira",
    "Maria Eduarda Ferreira da Silva",
    "Ananda Ribeiro Lima",
    "Felipe Serafim Marques",
    "Eduarda Almeida Camargo",
    "Sabrina Pereira dos Santos",
    "Francilene Aparecida de Jesus",
    "Deusana Fonseca Costa Sales",
    "Augusto Cesar Antunes Pereira",
    "Thales Adriano",
    "Bruna Fernanda Damaceno Silva",
    "Luiz Felipe Alves Camilo",
    "Érika Cristina Mendes dos Santos",
    "Aline Eduarda Garcia Rosa",
    "David Wiliam",
    "Lorrayne Sthefane Rocha Andrade",
    "Edilene do Carmo dos Santos"
  ]
};
