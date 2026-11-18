/* ===== LIFE: YOUR STORY — protótipo jogável =====
   Estrutura:
   1. Dados base   2. Cenas (narrativa)   3. Motor (efeitos, tempo, filas)
   4. Conquistas   5. Telas (HUD, menu, cena, resultado, final)
   Efeitos de uma escolha (todos opcionais):
     fx:{money,int,car,sau,dis,fel,rep}  rel:{marcos,bia,lucas}  set:{flag:valor}
     job:{t,s} (novo emprego) ou {t,add} (aumento)  rent:n
     later:[idCena, n]  -> consequência que volta após n decisões
     roll:{st, ok:{...}, no:{...}} -> teste de sorte influenciado por um atributo
     req:{atributo|money:n} -> bloqueia a opção se não atingir */
'use strict';

/* ---------- 1. DADOS BASE ---------- */
const KEY = 'lys_save_v1';
const ST = {int:'Inteligência', car:'Carisma', sau:'Saúde', dis:'Disciplina', fel:'Felicidade', rep:'Reputação'};
const PEOPLE = {marcos:'Marcos', bia:'Bia', lucas:'Lucas'};
const TRAITS = {
  curioso:['Curioso','+15 Inteligência',{int:15}],
  sociavel:['Sociável','+15 Carisma',{car:15}],
  atletico:['Atlético','+15 Saúde',{sau:15}],
  metodico:['Metódico','+15 Disciplina',{dis:15}],
  otimista:['Otimista','+15 Felicidade',{fel:15}],
  ambicioso:['Ambicioso','+12 Reputação, −3 Felicidade',{rep:12, fel:-3}]
};
const R = v => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
const $ = s => document.querySelector(s);
const clamp = v => Math.max(0, Math.min(100, v));
const LIVING = 350;           // custo de vida mensal (comida, transporte, contas)
const TOTAL = 16;             // nº aproximado de decisões (barra de progresso)
let S = null;                 // estado da partida
let pick = [];                // traços escolhidos na criação

/* ---------- 2. CENAS ---------- */
const SC = {

moradia:{cap:'Capítulo 1 · A chegada', who:'Dona Helena', mo:0,
 txt:s=>`A chave pesa na sua mão e a cidade cheira a chuva. Dona Helena, dona do prédio, mede você de cima a baixo. “Tenho a kitnet dos fundos e um quarto vago na minha casa. E o rapaz do 12, o Lucas, procura alguém pra dividir apartamento. Você tem dinheiro pra uns dois meses, ${s.name}. Escolhe com cuidado.”`,
 ops:[
  {t:'Alugar a kitnet dos fundos', d:'R$ 700/mês · privacidade total', rent:700, fx:{fel:6,dis:3}, r:'Silêncio, porta trancada e só você. Caro, mas é seu — e cada real do aluguel vai pesar no começo do mês.'},
  {t:'Dividir apartamento com o Lucas', d:'R$ 400/mês · casa cheia', rent:400, rel:{lucas:10}, fx:{car:4}, set:{roommate:1}, r:'Lucas aparece com uma pizza e três regras (a primeira: “ninguém encosta no meu queijo”). A casa é bagunçada, barulhenta e estranhamente viva.'},
  {t:'Ficar no quarto da Dona Helena', d:'R$ 300/mês · olhos por toda parte', rent:300, fx:{rep:4,fel:-3,sau:3}, set:{helena:1}, r:'Barato, com cheiro de café coado e almoço aos domingos. Em compensação, Dona Helena saberá de tudo que você fizer.'}
 ]},

emprego:{cap:'Capítulo 1 · Primeiro emprego', mo:1,
 txt:s=>`Seu saldo derrete mais rápido do que a planilha previa.${s.flags.roommate?' Lucas deixa um post-it na geladeira: “conta de luz vence dia 10”.':''} Em uma semana, quatro portas se abrem. Nenhuma é perfeita, e a que você escolher vai moldar os próximos meses.`,
 ops:[
  {t:'Atendente de call center', d:'R$ 1.800/mês · estável, mas cansativo', job:{t:'Atendente de call center',s:1800}, fx:{dis:5,fel:-5,sau:-3}, set:{jobType:'call'}, r:'Fone no ouvido, script na tela, clientes irritados. O contracheque, porém, é o mais gordo. Você aprende a respirar fundo.'},
  {t:'Barista na Casa Aurora', d:'R$ 1.500/mês · gente, café e horários flexíveis', job:{t:'Barista na Casa Aurora',s:1500}, fx:{car:5,fel:3}, set:{jobType:'cafe'}, r:'Você decora o nome de cinquenta clientes em uma semana. O cheiro de café gruda na roupa — e, estranhamente, no humor.'},
  {t:'Estágio na Agência Pulso', d:'R$ 1.100/mês · pouco dinheiro, muito aprendizado', job:{t:'Estagiário na Agência Pulso',s:1100}, fx:{int:5,rep:4,fel:-2}, set:{jobType:'agencia'}, r:'O salário é apertado, mas você está numa sala onde pessoas inteligentes discutem ideias. Cada reunião é uma aula.'},
  {t:'Entregador por aplicativo', d:'≈ R$ 1.400/mês · liberdade e risco', job:{t:'Entregador por aplicativo',s:1400}, fx:{sau:-4,dis:3,fel:-2}, set:{jobType:'app'}, r:'Ninguém manda em você, exceto a chuva, o trânsito e o algoritmo. Você conhece a cidade pelos atalhos.'}
 ]},

salario:{cap:'Capítulo 2 · O primeiro salário', who:'Marcos', mo:1,
 txt:s=>`Dia 5. O primeiro salário de verdade cai na conta e você fica um tempão olhando o número. O celular vibra: Marcos, seu amigo de infância, manda um áudio. “Bora comemorar! Hoje a gente merece, ${s.name}!” Mas o aluguel não espera, e você prometeu a si mesmo que ia economizar.`,
 ops:[
  {t:'Aceitar e aproveitar a noite', fx:{money:-250,fel:12,car:3}, rel:{marcos:8}, later:['atraso',2], r:'A noite vira madrugada. Karaokê, risada, uma conta que você nem quis olhar. Foi a melhor noite em meses — e o despertador de segunda ainda vai cobrar.'},
  {t:'Guardar o dinheiro e ficar em casa', fx:{dis:5,fel:-6}, rel:{marcos:-8}, r:'Você abre a planilha e vê o saldo crescer. Marcos manda um “beleza, fica pra próxima” seco. O silêncio depois é pesado.'},
  {t:'Ir, mas com limite de R$ 80', fx:{money:-80,fel:6,dis:3}, rel:{marcos:4}, r:'Você avisa o limite, rindo. Marcos reclama, mas respeita. Duas cervejas, muita conversa — e você volta pra casa sóbrio e com a carteira inteira.'}
 ]},

curso:{cap:'Capítulo 2 · Investir em si', who:'Prof. Tavares', mo:2,
 txt:s=>`No mural do prédio comercial, um cartaz: “Turmas noturnas abertas”. O professor Tavares, que lê a sua hesitação, se aproxima. “Quem não estuda hoje vira o assunto do amanhã de quem estudou.” Você tem pouco tempo e menos dinheiro, mas a vontade de crescer existe. A questão é como.`,
 ops:[
  {t:'Curso técnico de Informática', d:'R$ 500 · noites ocupadas', fx:{money:-500,int:8,dis:4,sau:-3}, set:{tech:1}, r:'Você descobre que lógica de programação é um quebra-cabeça viciante. As noites ficam curtas, mas a cabeça fica longe.'},
  {t:'Curso de inglês', d:'R$ 300 · abre portas e conversas', fx:{money:-300,int:4,car:4}, set:{english:1}, r:'Na primeira aula, você tropeça no próprio sotaque e ri junto com a turma. Em três meses, já entende música sem legenda.'},
  {t:'Estudar sozinho com vídeos gratuitos', d:'Grátis · exige muita disciplina', req:{dis:45}, fx:{int:5,dis:6}, set:{auto:1}, r:'Sem mensalidade, sem professor — só você e a vontade. Quando funciona, é mágico: você aprende no seu ritmo e descobre que consegue.'},
  {t:'Descansar e cuidar da vida por ora', fx:{fel:6,sau:4,car:2}, r:'Você dorme oito horas, cozinha, vê filmes. Não é um grande passo, mas o corpo agradece. O cartaz continua lá, esperando.'}
 ]},

imprevisto:{cap:'Capítulo 3 · Quando a vida cobra', mo:2,
 txt:s=>`Um estalo, um cheiro de queimado, a tela apagando. Seu notebook, sua ferramenta pra tudo, morre numa quinta-feira à noite. A assistência técnica fala em R$ 900 e três semanas de espera. Você olha o saldo: ${R(s.money)}.${s.flags.roommate?' Lucas espia do corredor: “essa cara é de quem perdeu um amigo”.':''}`,
 ops:[
  {t:'Pagar o conserto à vista', d:'−R$ 900', req:{money:900}, fx:{money:-900,fel:-2}, r:'Dói ver o saldo cair de uma vez. Mas o notebook volta como novo e você dorme sem dívida.'},
  {t:'Parcelar no cartão', d:'Leve agora, mas…', fx:{money:-150,fel:2}, set:{debt:1}, later:['fatura',3], r:'“Em 6 vezes sem juros!”, diz o atendente. Você assina rápido, sem ler as letras miúdas. Alívio imediato.'},
  {t:'Pedir ajuda à família', d:'Pedir é sempre difícil', fx:{money:-300,fel:-4}, set:{familyHelp:1}, r:'Sua mãe manda R$ 600 sem perguntar nada, e diz: “depois você me conta como está”. Você se sente pequeno e muito amado.'},
  {t:'Consertar com o primo do Lucas', d:'Barato, mas ninguém garante', roll:{st:'int',
    ok:{fx:{money:-250,int:3}, r:'O primo troca uma peça, cobra R$ 250 e entrega funcionando. Você até aprende o que quebrou.'},
    no:{fx:{money:-500,fel:-4}, r:'O notebook volta pior. Ele devolve metade e pede desculpas, mas você acaba pagando outra assistência.'}}, r:'Você entrega o notebook a um desconhecido numa garagem lotada de peças…'}
 ]},

marcos:{cap:'Capítulo 3 · Amizade em jogo', who:'Marcos', mo:2,
 txt:s=>s.rel.marcos>=8
  ? `Marcos aparece na sua porta com a energia de sempre. “Descobri um negócio: revender tênis importados. Preciso de R$ 600 pra primeira leva. Você é a primeira pessoa em quem confio.” Ele sorri, mas há algo meio ansioso no olhar. Vocês dividiram tanto que negar parece traição.`
  : `Marcos aparece depois de semanas de silêncio. “Descobri um negócio: revender tênis importados. Preciso de R$ 600.” Ele evita o assunto da sua ausência na comemoração. Pedir agora, sem ter dividido nada recente, soa… conveniente.`,
 ops:[
  {t:'Emprestar os R$ 600', fx:{money:-600}, rel:{marcos:6}, set:{loan:600}, later:['marcos2',3], r:'Você transfere antes de ter tempo de se arrepender. Marcos te abraça forte e promete devolver “em dois meses, no máximo”.'},
  {t:'Emprestar R$ 300 e deixar claro que é só isso', fx:{money:-300,dis:2}, rel:{marcos:2}, set:{loan:300}, later:['marcos2',3], r:'“Metade agora, e se der certo, a gente conversa.” Marcos faz uma careta, mas aceita. Ao menos você foi honesto.'},
  {t:'Recusar, explicando sua situação', fx:{dis:2,fel:-3}, rel:{marcos:-10}, r:'Você fala com calma. Marcos ouve, concorda com a cabeça e vai embora sem olhar pra trás. Ficou um vazio no sofá.'},
  {t:'Oferecer ajuda para montar um plano, sem dinheiro', roll:{st:'car',
    ok:{fx:{car:3,int:2}, rel:{marcos:8}, r:'Vocês passam a noite com papel e caneta. Marcos percebe os buracos do plano e agradece: “você me salvou de uma grande furada”.'},
    no:{fx:{fel:-2}, rel:{marcos:-2}, r:'Ele ouve, mas entende como desprezo. “Eu queria dinheiro, não aula.” A conversa morre num silêncio constrangido.'}}, r:'Você puxa uma cadeira e pede para ver o plano…'}
 ]},

extra:{cap:'Capítulo 4 · Uma chance no trabalho', who:'Rafael', mo:2,
 txt:s=>`Rafael, o coordenador, encontra você perto da máquina de café. “Preciso de alguém para um projeto urgente no fim de semana. Pago R$ 600 por fora e lembro de quem ajudou.” Ele sorri, mas você sabe: não é só um pedido, é um teste. Você trabalha como ${s.job.t.toLowerCase()} e o corpo já anda reclamando.${s.st.sau<45?' Você está exausto.':''}`,
 ops:[
  {t:'Aceitar o projeto', fx:{money:600,rep:8,dis:3,sau:-8}, set:{extra:1}, r:'Dois fins de semana de pizza fria e prazos apertados. No segundo, Rafael elogia você diante da equipe. Suas olheiras são o preço.'},
  {t:'Recusar educadamente', fx:{fel:5,rep:-3}, r:'“Tenho compromisso que não posso mudar.” Rafael assente, mas seu sorriso demora um segundo a menos. Você descansa — e o relógio da carreira anda.'},
  {t:'Negociar uma folga em troca', d:'Ousado', roll:{st:'car',
    ok:{fx:{money:600,rep:4,sau:-3,fel:3}, set:{extra:1}, r:'Rafael ri: “ninguém nunca negociou comigo.” Você leva o bônus e uma terça de folga. Respeito de graça.'},
    no:{fx:{rep:-2,fel:-3}, r:'“Não é assim que funciona por aqui.” Rafael muda de assunto, e a conversa esfria de vez.'}}, r:'Você respira e coloca a proposta na mesa…'}
 ]},

bia:{cap:'Capítulo 4 · Um encontro inesperado', who:'Bia', mo:2,
 txt:s=>`Numa terça chuvosa, na fila do café do prédio ao lado, alguém esbarra em você e derruba um copo inteiro nos seus papéis. “Meu Deus, desculpa! Eu sou a Bia, e geralmente sou mais graciosa que isso.” Ela ri, nervosa, e os olhos de vocês se cruzam um segundo a mais do que o normal.`,
 ops:[
  {t:'Fazer uma piada e convidar para outro café', roll:{st:'car',
    ok:{fx:{fel:6,car:2}, rel:{bia:12}, r:'“Se for pra derrubar café em mim, que seja pelo menos um expresso decente.” Ela gargalha. Trocam número antes mesmo de secar os papéis.'},
    no:{fx:{fel:-3}, rel:{bia:2}, r:'A piada sai estranha, ela sorri educada e “fica pra próxima”. No caminho de volta você revive a frase dez vezes.'}}, r:'Você sente o coração acelerar e solta a primeira frase que vem à cabeça…'},
  {t:'Ajudar a limpar e se apresentar com calma', fx:{car:2,rep:2}, rel:{bia:7}, r:'Vocês secam papel por papel, conversando baixinho. Ela diz onde trabalha e você promete passar lá. Foi simples, e simples foi bom.'},
  {t:'Dizer que não foi nada e seguir o dia', fx:{dis:2}, r:'Você tem reunião em dez minutos e a cabeça cheia. Mais tarde, no elevador, percebe que nem perguntou o sobrenome dela.'}
 ]},

dani:{cap:'Capítulo 5 · Uma decisão difícil', who:'Dani', mo:2,
 txt:s=>`Fim do expediente. Por acaso, você vê no sistema que Dani, o colega simpático que te ajudou no primeiro dia, lançou horas que não trabalhou. Rafael avisou que haverá auditoria na sexta, e quem for pego será demitido na hora. Dani está a três mesas de distância, ainda sem saber que você viu.`,
 ops:[
  {t:'Conversar com o Dani em particular', fx:{rep:2,dis:2}, set:{dani:'warned'}, later:['dani2',2], r:'Você chama Dani para um café. Ele fica pálido, agradece pelo aviso e corrige tudo antes de sexta. “Te devo uma.”'},
  {t:'Avisar o Rafael', fx:{rep:8,fel:-5}, set:{dani:'reported'}, later:['dani2',2], r:'Rafael ouve, anota e agradece. “Vou resolver.” Você sai com a sensação de ter feito o certo e com um nó no estômago.'},
  {t:'Fingir que não viu nada', fx:{fel:-2}, set:{dani:'ignored'}, later:['dani2',2], r:'Você fecha a aba, pega a mochila e vai embora. Mas a imagem da planilha te acompanha até o ponto de ônibus.'}
 ]},

saude:{cap:'Capítulo 5 · O corpo avisa', mo:1,
 when:s=>s.st.sau<45||s.st.fel<35,
 txt:s=>`Você acorda de madrugada com o coração disparado e a cabeça pesada. No espelho, uma versão mais cansada de você mesmo olha de volta. ${s.st.sau<45?'Há semanas você ignora dores, sono ruim e refeições improvisadas.':'Faz tempo que nada traz alegria de verdade.'} Algo precisa mudar, e você sabe.`,
 ops:[
  {t:'Ir ao médico e pedir um atestado', d:'−R$ 150', fx:{money:-150,sau:15,fel:5,rep:-2}, r:'O médico não encontra nada grave: só um corpo exausto pedindo trégua. Recebe orientações, dois dias de descanso e uma bronca gentil.'},
  {t:'Mudar a rotina: caminhar e dormir melhor', fx:{sau:8,dis:4,fel:3}, r:'Sem remédio, sem pressa. Você começa caminhando quinze minutos por dia. Em duas semanas, o sono volta.'},
  {t:'Ignorar e tomar mais café', d:'Alta aposta', roll:{st:'sau',
    ok:{fx:{rep:3}, r:'Por pouco tempo, funciona. Você entrega tudo no prazo, mas se pergunta até quando.'},
    no:{fx:{sau:-15,money:-400,fel:-5}, r:'Você desmaia no trabalho e passa a noite no pronto-socorro. A conta chega, e o susto muda a forma como você se enxerga.'}}, r:'Você bebe o café e segue o dia como se nada fosse…'}
 ]},

r1:{cap:'Capítulo 6 · Um acaso na rua', mo:1,
 txt:s=>`Na saída do mercado, você vê uma carteira no chão. Dentro, R$ 250, um documento e uma foto de criança. Ninguém por perto. Seu saldo está curto, e a tentação tem voz própria.`,
 ops:[
  {t:'Procurar o dono e devolver tudo', fx:{rep:3,dis:2,fel:3}, r:'Pelo documento, você acha o dono no mesmo bairro. Ele chora de alívio e insiste em dar uma gorjeta de R$ 50.'},
  {t:'Pegar o dinheiro e largar a carteira', fx:{money:250,fel:-3,dis:-3,rep:-1}, r:'O dinheiro ajuda, mas a foto da criança ainda aparece nos seus pensamentos quando você tenta dormir.'},
  {t:'Entregar na delegacia mais próxima', fx:{rep:1,dis:2}, r:'Você preenche um formulário, recebe um carimbo e nunca saberá o final. Ao menos, fez a parte que lhe cabia.'}
 ]},
r2:{cap:'Capítulo 6 · Um reencontro', who:'Camila', mo:1,
 txt:s=>`Camila, sua antiga colega de colégio, manda mensagem: reunião de turma sábado, num bar caro, R$ 150 por pessoa. “Vai ter todo mundo! O Diego virou médico, a Lara abriu empresa…” Você sente a velha comparação cutucar.`,
 ops:[
  {t:'Ir e aproveitar a noite', d:'−R$ 150', fx:{money:-150,car:4,fel:6,rep:2}, r:'Rever rostos antigos é um tipo de viagem no tempo. Você descobre que quase todo mundo está tão perdido quanto você.'},
  {t:'Ficar em casa e estudar', fx:{dis:3,int:2,fel:-2}, r:'Você troca o bar por apostilas. Ninguém notou sua ausência, mas você sim.'},
  {t:'Ir só para o início e sair cedo', roll:{st:'car',
    ok:{fx:{money:-60,car:3,fel:4}, r:'Você chega, cumprimenta todos, ri das piadas e se despede antes da conta. Ninguém reparou.'},
    no:{fx:{money:-150,fel:-2}, r:'A conta é dividida igualmente, mesmo para quem foi embora cedo. Você paga sem graça.'}}, r:'Você diz que “só vai dar um oi”…'}
 ]},

convite:{cap:'Capítulo 7 · Oportunidade inesperada', who:'Thiago', mo:2,
 txt:s=>`Num churrasco de aniversário, Thiago, ex-colega do colégio, puxa você para um canto. “Tenho um plano: marmitas caseiras entregues no centro. Já tenho cozinheira e clientes. Falta R$ 1.000 e alguém que cuide do atendimento.” Os olhos dele brilham. Dessas ideias, algumas viram negócio — e a maioria vira história pra contar.`,
 ops:[
  {t:'Investir R$ 1.000 e virar sócio', d:'Risco real', req:{money:1000}, fx:{money:-1000}, roll:{st:'int',
    ok:{fx:{money:2200,rep:5,fel:10}, set:{socio:1}, r:'As marmitas viram febre no centro. Em dois meses, você recupera o investimento — e o lucro cai na conta.'},
    no:{fx:{fel:-8,rep:-2}, set:{socio:1}, r:'Dois sócios, nenhum plano de contingência. O fornecedor quebra a promessa e o negócio fecha em sete semanas.'}}, r:'Você assina o contrato no guardanapo e aperta a mão dele…'},
  {t:'Entrar só com seu tempo, sem investir', roll:{st:'dis',
    ok:{fx:{money:500,rep:4,int:3,sau:-3}, r:'Você atende clientes depois do expediente e ajuda a organizar a logística. Thiago cumpre a promessa: R$ 500 e muito crédito.'},
    no:{fx:{sau:-5,fel:-4}, r:'Você tenta, mas o cansaço cobra. Thiago acaba procurando outra pessoa e você sai com a sensação de ter desperdiçado a chance.'}}, r:'“Sem dinheiro, mas com muito suor”, você diz…'},
  {t:'Recusar e focar no próprio caminho', fx:{dis:3,fel:2}, r:'Você agradece, aperta a mão dele e segue o plano. Meses depois, vê um caminhão de marmitas passar e pensa “e se?”.'}
 ]},

bia2:{cap:'Capítulo 7 · Entre dois caminhos', who:'Bia', mo:2,
 when:s=>s.rel.bia>=8,
 txt:s=>`Duas semanas depois de vários cafés, Bia chama você para jantar. Entre uma garfada e outra, solta: “Recebi uma proposta de emprego em Curitiba. Ainda não aceitei.” Ela mexe no guardanapo e espera sua reação como quem espera um veredito.`,
 ops:[
  {t:'Apoiar a decisão dela, seja qual for', fx:{fel:-4,rep:2}, rel:{bia:6}, set:{biaAway:1}, r:'“Você tem que ir. A gente se vê.” Ela sorri com os olhos úmidos. É uma despedida bonita — e dolorida.'},
  {t:'Pedir que ela fique', d:'Arriscado', roll:{st:'car',
    ok:{rel:{bia:10}, fx:{fel:6}, set:{biaStays:1}, r:'Você fala com sinceridade, sem cobrar. Ela decide recusar e ficar para ver o que vocês podem ser.'},
    no:{rel:{bia:-15}, fx:{fel:-8}, set:{biaAway:1}, r:'Ela fecha o rosto: “eu não pedi permissão.” A conversa termina fria, e a viagem dela é marcada naquela semana.'}}, r:'As palavras saem antes de você pensar…'},
  {t:'Propor ir morar lá no futuro, quando der', d:'Exige disciplina', req:{dis:50}, rel:{bia:8}, fx:{fel:5,dis:2}, set:{biaPlan:1}, r:'Você mostra números, datas e uma meta. Ela fica sem palavras e depois ri: “você já pensou em tudo!”'}
 ]},

proposta:{cap:'Capítulo 8 · A grande encruzilhada', who:'Rafael', mo:3,
 txt:s=>`Rafael chama você para uma conversa a portas fechadas. Na mesa, três possibilidades que moldam os próximos anos. “Você cresceu aqui como ${s.job.t.toLowerCase()}, mas o mercado está de olho em você também.” ${s.flags.extra?'Ele lembra do projeto de fim de semana, e isso pesa a seu favor.':''} A decisão é sua.`,
 ops:[
  {t:'Aceitar a promoção interna', d:'+R$ 700/mês · mais responsabilidade', req:{rep:50}, job:{t:'Líder de equipe',add:700}, fx:{rep:6,sau:-4,dis:3,fel:-2}, r:'Seu nome vai para a porta da sala. Você agora coordena colegas, cuida de metas e dorme com planilhas na cabeça.'},
  {t:'Ir para a concorrente', d:'+R$ 1.000/mês · mais risco', req:{int:48}, job:{t:'Analista na Nova Vértice',add:1000}, fx:{int:3,fel:2,rep:-2}, r:'Rafael aperta sua mão sem sorrir. “Boa sorte.” A nova empresa é maior, mais fria e mais bem paga.'},
  {t:'Sair e viver de projetos próprios', d:'Tudo ou quase nada', roll:{st:'dis',
    ok:{job:{t:'Freelancer',s:2600}, fx:{fel:8,rep:4}, set:{freela:1}, r:'Os primeiros clientes chegam por indicação. Em dois meses, você ganha mais do que em qualquer emprego e escolhe seus horários.'},
    no:{job:{t:'Freelancer',s:900}, fx:{fel:-6,dis:2}, set:{freela:1}, r:'Sem rotina e sem clientes fixos, o dinheiro vai entrando e saindo em ondas. Você aprende rápido — mas do jeito difícil.'}}, r:'Você entrega o crachá com um frio na barriga…'},
  {t:'Ficar onde está, com estabilidade', fx:{fel:3,sau:3}, r:'“Entendo.” Rafael parece decepcionado, mas respeita. Você sai da sala com a sensação de ter escolhido a paz — por enquanto.'}
 ]},

mae:{cap:'Capítulo 9 · O telefone às 23h', who:'Sua mãe', mo:2,
 txt:s=>`O celular toca às 23h. É sua mãe — ela nunca liga tão tarde. “Meu bem, o telhado de casa cedeu com a chuva. Já tirei seu irmão do quarto, mas o conserto vai custar uns R$ 2.000. Eu dou um jeito, não se preocupe.” Ela diz que não precisa. A voz dela diz o contrário.`,
 ops:[
  {t:'Enviar R$ 2.000', req:{money:2000}, fx:{money:-2000,fel:8,rep:2}, set:{mom:'helped'}, r:'“Filho(a), você não precisava…” — mas ela chora do outro lado. Você olha seu saldo e sente que fez exatamente o que devia.'},
  {t:'Enviar R$ 700 agora e o resto depois', fx:{money:-700,fel:2}, set:{mom:'partial'}, r:'Você manda o que consegue e promete o resto. Ela agradece, mas você percebe que ela já está pensando no empréstimo do vizinho.'},
  {t:'Viajar para ajudar pessoalmente', d:'Perder dias de trabalho', fx:{money:-300,rep:-4,fel:10,sau:-2}, rel:{lucas:2}, set:{mom:'visited'}, r:'Três dias de telhado, café e conversas. Seu irmão jura que você “virou gente grande”. Seu chefe resmunga na volta.'},
  {t:'Dizer que não pode ajudar agora', fx:{fel:-10,dis:2}, set:{mom:'refused'}, r:'Um silêncio longo. “Tudo bem, meu bem. Eu me viro.” Ela desliga primeiro. Você fica olhando para a tela escura.'}
 ]},

final:{cap:'Capítulo 10 · Três anos depois', mo:3,
 txt:s=>`Três anos desde a mala e a chave pesada. No espelho, já não está quem chegou. Cada escolha deixou uma marca: algumas visíveis, outras só suas. Hoje a pergunta aparece sem aviso: o que você quer que os próximos anos sejam?`,
 ops:[
  {t:'Apostar tudo na carreira', fx:{rep:8,int:4,sau:-4}, set:{dir:'career'}, r:'Você escolhe o foco. As noites ficam mais longas e o nome, mais conhecido.'},
  {t:'Construir laços e viver com as pessoas', fx:{fel:10,car:4}, set:{dir:'people'}, r:'Você escolhe jantares, ligações, visitas. Nunca esteve tão cercado de gente — e tão em paz.'},
  {t:'Aprender sem pressa', fx:{int:8,dis:4}, set:{dir:'learn'}, r:'Você escolhe livros, cursos, perguntas. Há uma vida inteira para entender o mundo.'},
  {t:'Viajar e recomeçar em outro lugar', d:'−R$ 1.500', fx:{money:-1500,fel:12,sau:4}, set:{dir:'free'}, r:'Você compra a passagem antes de pensar demais. Há uma cidade nova esperando por quem você se tornou.'}
 ]},

/* ---- Consequências: voltam depois de decisões anteriores ---- */

atraso:{cap:'Consequência · A ressaca', who:'Rafael', mo:1,
 txt:s=>`Segunda-feira, 9h47. Você chega ao trabalho com a voz rouca e o rosto de quem dormiu pouco. Rafael está esperando, braços cruzados. “Tudo bem com você? Já é a segunda vez que chega atrasado.”`,
 ops:[
  {t:'Inventar uma desculpa convincente', roll:{st:'car',
    ok:{r:'“Meu ônibus quebrou.” Ele assente e deixa passar. Você fica com o gosto amargo da mentira.'},
    no:{fx:{rep:-8}, r:'Rafael nem sorri: “vi sua foto na festa.” Pega mal pra você e pior pra imagem.'}}, r:'Você inventa uma história com voz firme…'},
  {t:'Assumir o erro com sinceridade', fx:{rep:2,dis:3,fel:-2}, r:'“Exagerei no fim de semana. Não se repete.” Rafael te olha por um instante e concorda. Respeito se constrói assim.'},
  {t:'Culpar o trânsito e compensar com horas extras', fx:{dis:2,sau:-3,rep:1}, r:'Você fica até mais tarde pelos próximos dias. Rafael não diz nada, mas anota mentalmente.'}
 ]},

fatura:{cap:'Consequência · A fatura chegou', mo:1,
 txt:s=>`A fatura do cartão chega, e as letras miúdas aparecem em letras bem grandes. O parcelamento que parecia leve carrega juros que você não entendeu. O valor para quitar tudo agora: R$ 600.`,
 ops:[
  {t:'Quitar tudo de uma vez', d:'−R$ 600', req:{money:600}, fx:{money:-600,dis:4}, r:'Você paga, respira fundo e se promete: nunca mais assina sem ler.'},
  {t:'Pagar só o mínimo', d:'−R$ 150, mas a dívida cresce', fx:{money:-150,fel:-4}, set:{debtHeavy:1}, r:'A dívida segue crescendo em silêncio. Você sabe, e não gosta de olhar para ela.'},
  {t:'Negociar com o banco', roll:{st:'car',
    ok:{fx:{money:-300,dis:3}, r:'A atendente encontra um desconto de juros. Você sai com a dívida reduzida e um novo respeito pelas letras miúdas.'},
    no:{fx:{money:-500,fel:-3}, r:'“Infelizmente, não há como ajustar.” Você paga mais do que previa, entre desânimo e irritação.'}}, r:'Você liga e respira fundo antes de falar…'}
 ]},

marcos2:{cap:'Consequência · O que foi emprestado', who:'Marcos', mo:1,
 txt:s=>s.rel.marcos>=8
  ? `Marcos aparece na sua porta com uma caixa de tênis debaixo do braço e um sorriso largo. “Deu certo! Vim devolver o que te devo — e um pouco mais, de agradecimento.” Ele estende um envelope com ${R(s.flags.loan+200)}.`
  : `Marcos evita olhar nos seus olhos. “O negócio não deu certo, e ainda devo pros fornecedores.” Ele não pede desculpa de imediato. Você percebe que o empréstimo agora é uma pedra no meio de vocês.`,
 ops:s=>s.rel.marcos>=8
  ? [
   {t:'Aceitar tudo, com um abraço', fx:{money:s.flags.loan+200,fel:5}, rel:{marcos:5}, set:{marcos:'paid'}, r:'“Amigo é pra essas coisas.” Ele ri de alívio. Vocês dividem uma pizza para comemorar — e dessa vez é você quem paga.'},
   {t:'Pegar só o que emprestou e recusar o extra', fx:{money:s.flags.loan,rep:3}, rel:{marcos:8}, set:{marcos:'paid'}, r:'“Fica com o seu lucro, você mereceu.” Marcos aperta seu ombro com os olhos úmidos.'}
  ]
  : [
   {t:'Cobrar com firmeza', fx:{money:Math.round(s.flags.loan/2),dis:3}, rel:{marcos:-10}, set:{marcos:'gone'}, r:'Você tira metade, mas perde a amizade. No grupo, as mensagens vão rareando até acabarem.'},
   {t:'Perdoar a dívida', fx:{rep:3,fel:-2}, rel:{marcos:6}, set:{marcos:'forgiven'}, r:'“Esquece, a gente resolve outra coisa.” Marcos baixa a cabeça, agradecido. Você perde o dinheiro, mas ganha uma amizade que pode durar.'},
   {t:'Propor parcelamento', roll:{st:'car',
     ok:{fx:{money:s.flags.loan}, rel:{marcos:3}, set:{marcos:'paid'}, r:'Marcos topa pagar em parcelas e cumpre — mês a mês. Entre vocês, ficou confiança.'},
     no:{fx:{fel:-3}, rel:{marcos:-4}, set:{marcos:'gone'}, r:'As parcelas chegam atrasadas, depois param. Marcos some de vez.'}}, r:'Você sugere um combinado simples e realista…'}
  ]},

dani2:{cap:'Consequência · O que Dani fez', who:'Dani', mo:1,
 txt:s=>({
  warned:`Dani te procura no almoço. “Corrigi tudo antes da sexta. Se não fosse você, eu estaria na rua.” Ele hesita. “Tem uma vaga numa agência parceira, e eu posso te indicar.”`,
  reported:`Sexta-feira, Dani é chamado na sala do Rafael e sai com uma caixa de papelão. Quando você passa pelo corredor, as conversas silenciam. Ninguém diz nada, mas todos olham.`,
  ignored:`A auditoria encontra o problema. Dani é chamado e, antes de sair, aponta para você: “ele também viu.” Rafael pede uma conversa. “Você sabia?”`
 })[s.flags.dani],
 ops:s=>({
  warned:[
   {t:'Aceitar a indicação', fx:{money:300,rep:4,car:3}, set:{contact:1}, r:'A entrevista é informal. Você não muda de emprego, mas ganha um bico de R$ 300 e um contato valioso.'},
   {t:'Agradecer, mas recusar', fx:{fel:4,rep:2}, r:'“Fiz o que qualquer um faria.” Dani balança a cabeça. “Não faria, não.”'}],
  reported:[
   {t:'Assumir: “foi o certo a fazer”', fx:{rep:3,car:-4,fel:-3}, r:'Você se mantém firme, mas almoça sozinho nos próximos dias.'},
   {t:'Procurar o Dani e explicar', roll:{st:'car',
     ok:{fx:{car:3,fel:3}, r:'Dani escuta e, depois de muito tempo, concorda: “eu sabia o risco.” Não são amigos, mas há paz entre vocês.'},
     no:{fx:{fel:-5}, r:'“Você escolheu a regra em vez de uma pessoa.” Ele vai embora, e a frase fica com você.'}}, r:'Você o encontra na calçada, ainda com a caixa nas mãos…'}],
  ignored:[
   {t:'Admitir que sabia e se desculpar', fx:{rep:-3,dis:3}, r:'“Eu vi e fiquei com medo.” Rafael faz uma pausa. “Honestidade vale mais do que silêncio.” Você sai com um aviso, não com uma demissão.'},
   {t:'Negar que sabia', roll:{st:'car',
     ok:{fx:{fel:-2}, r:'Rafael acredita, ou finge acreditar. Você sai da sala com o coração martelando.'},
     no:{fx:{rep:-12}, r:'“Ele tem o registro de acesso do seu login.” Rafael balança a cabeça. A mentira cobra três vezes mais que a verdade.'}}, r:'Você sustenta o olhar e diz que não sabia de nada…'}]
 })[s.flags.dani]}
};

/* Ordem da jornada. Cenas com `when` só aparecem se a condição for verdadeira.
   Arrays sorteiam um evento aleatório entre as opções. */
const ORDER = ['moradia','emprego','salario','curso','imprevisto','marcos','extra','bia','dani','saude',['r1','r2'],'convite','bia2','proposta','mae','final'];

/* ---------- 3. MOTOR ---------- */
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } };

function newGame(name, traits) {
  const st = {int:40, car:40, sau:40, dis:40, fel:40, rep:40};
  traits.forEach(k => { for (const a in TRAITS[k][2]) st[a] += TRAITS[k][2][a]; });
  S = {name, tr:traits, age:18, t:0, money:1500, st, flags:{}, rel:{marcos:0, bia:0, lucas:0},
       job:null, rent:0, pend:[], idx:0, n:0, ach:[], cur:null, phase:'scene', res:null};
  buildHud();
  next();
}

// Escolhe a próxima cena: primeiro consequências pendentes, depois a ordem normal
function next() {
  const due = S.pend.findIndex(p => p.at <= S.n);
  S.cur = null;
  if (due > -1) S.cur = S.pend.splice(due, 1)[0].id;
  else while (S.idx < ORDER.length) {
    let id = ORDER[S.idx++];
    if (Array.isArray(id)) id = id[Math.random() * id.length | 0];
    if (!SC[id].when || SC[id].when(S)) { S.cur = id; break; }
  }
  if (!S.cur) return showEnd();
  S.phase = 'scene'; S.res = null; save(); showScene();
}

const opsOf = sc => typeof sc.ops === 'function' ? sc.ops(S) : sc.ops;

// Devolve o texto do requisito que falta (ou '' se a opção está liberada)
function lock(c) {
  for (const k in c.req || {}) {
    const have = k === 'money' ? S.money : S.st[k];
    if (have < c.req[k]) return k === 'money' ? R(c.req[k]) : `${ST[k]} ${c.req[k]}`;
  }
  return '';
}

// Aplica um bloco de efeitos ao estado
function apply(o) {
  for (const k in o.fx || {}) { if (k === 'money') S.money += o.fx[k]; else S.st[k] = clamp(S.st[k] + o.fx[k]); }
  for (const k in o.rel || {}) S.rel[k] += o.rel[k];
  Object.assign(S.flags, o.set || {});
  if (o.job) {
    if (o.job.s != null) S.job = {t:o.job.t, s:o.job.s};
    else { S.job.s += o.job.add; S.job.t = o.job.t || S.job.t; }
  }
  if (o.rent != null) S.rent = o.rent;
  if (o.later) S.pend.push({id:o.later[0], at:S.n + o.later[1]});
}

function choose(i) {
  const sc = SC[S.cur], c = opsOf(sc)[i];
  if (!c || lock(c) || S.phase !== 'scene') return;
  const before = {...S.st}, rb = {...S.rel}, m0 = S.money;
  let txt = c.r || '', tag = '', ok = true;
  apply(c);
  if (c.roll) {                                   // teste de sorte: atributo alto = mais chance
    const chance = Math.max(.15, Math.min(.9, .25 + S.st[c.roll.st] * .006));
    ok = Math.random() < chance;
    const o = ok ? c.roll.ok : c.roll.no;
    apply(o); txt += ' ' + o.r; tag = ok ? 'Deu certo' : 'Não saiu como esperado';
  }
  const mFx = S.money - m0;
  // Passagem do tempo: salário − aluguel − custo de vida
  const mo = sc.mo ?? 2, bal = ((S.job ? S.job.s : 0) - S.rent - LIVING) * mo;
  S.t += mo; S.money += bal; S.age = 18 + Math.floor(S.t / 12);
  if (S.money < 0) { S.st.fel = clamp(S.st.fel - 4); S.flags.wasBroke = 1; }   // dívida pesa na cabeça
  S.n++;
  const deltas = [];
  if (mFx) deltas.push({l:'Dinheiro', v:mFx, money:1});
  for (const k in ST) if (S.st[k] !== before[k]) deltas.push({l:ST[k], v:S.st[k] - before[k]});
  for (const k in PEOPLE) if (S.rel[k] !== rb[k]) deltas.push({l:PEOPLE[k], v:S.rel[k] - rb[k]});
  const newAch = checkAch();
  S.phase = 'result'; S.res = {pick:c.t, txt, tag, ok, deltas, mo, bal}; save();
  updateHud(before); showResult();
  newAch.forEach(a => toast(a));
}

/* ---------- 4. CONQUISTAS ---------- */
const ACH = [
  ['job','Primeiro salário','Conseguiu um emprego.', s => !!s.job],
  ['saver','Poupador','Juntou R$ 3.000.', s => s.money >= 3000],
  ['broke','No vermelho','Ficou com saldo negativo.', s => s.flags.wasBroke],
  ['friend','Amigo de verdade','Laço forte com Marcos ou Lucas.', s => s.rel.marcos >= 15 || s.rel.lucas >= 15],
  ['love','Coração aberto','Aproximou-se de Bia.', s => s.rel.bia >= 15],
  ['brain','Mente afiada','Inteligência 65 ou mais.', s => s.st.int >= 65],
  ['iron','Disciplina de ferro','Disciplina 65 ou mais.', s => s.st.dis >= 65],
  ['name','Nome respeitado','Reputação 65 ou mais.', s => s.st.rep >= 65],
  ['bold','Aposta ousada','Virou sócio do Thiago.', s => s.flags.socio],
  ['honest','Consciência limpa','Foi honesto numa situação difícil.', s => s.flags.dani === 'warned' || s.flags.dani === 'reported'],
  ['zen','Equilíbrio','Todos os atributos acima de 50.', s => Object.values(s.st).every(v => v > 50)]
];
function checkAch() {
  const fresh = ACH.filter(a => !S.ach.includes(a[0]) && a[3](S));
  fresh.forEach(a => S.ach.push(a[0]));
  return fresh;
}
function toast(a) {
  const e = document.createElement('div');
  e.className = 'toast'; e.innerHTML = `Conquista: <b>${a[1]}</b>`;
  $('#toast').appendChild(e);
  setTimeout(() => e.remove(), 4200);
}

/* ---------- 5. TELAS ---------- */
function stage(html) {
  const e = $('#stage');
  e.innerHTML = html; e.classList.remove('fade'); void e.offsetWidth; e.classList.add('fade');
  window.scrollTo(0, 0);
}

function buildHud() {
  $('#hud').innerHTML = `<div class="top"><div class="who"><b>${S.name}</b><span id="hAge"></span></div><div class="money" id="hMoney"></div></div>
  <div class="stats">${Object.keys(ST).map(k => `<div class="st" id="s_${k}"><label>${ST[k]}<em id="v_${k}"></em></label><i><u id="b_${k}"></u></i></div>`).join('')}</div>
  <div class="ppl" id="hPpl"></div><div class="prog"><u id="hProg"></u></div>`;
  setTimeout(() => updateHud(), 30);   // pequeno atraso para as barras animarem ao entrar
}

function updateHud(before) {
  $('#hAge').textContent = `${S.age} anos · mês ${S.t + 1}${S.job ? ' · ' + S.job.t : ' · sem emprego'}`;
  const m = $('#hMoney'); m.textContent = R(S.money); m.className = 'money' + (S.money < 0 ? ' neg' : '');
  for (const k in ST) {
    $('#v_' + k).textContent = S.st[k]; $('#b_' + k).style.width = S.st[k] + '%';
    if (before && before[k] !== S.st[k]) {      // destaque temporário para o que mudou
      const el = $('#s_' + k), cls = S.st[k] > before[k] ? 'up' : 'dn';
      el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 1400);
    }
  }
  $('#hPpl').innerHTML = Object.keys(PEOPLE).filter(k => S.rel[k]).map(k => `<span>${PEOPLE[k]} <b>${S.rel[k] > 0 ? '+' : ''}${S.rel[k]}</b></span>`).join('');
  $('#hProg').style.width = Math.min(100, S.n / TOTAL * 100) + '%';
}

function showMenu() {
  $('#hud').innerHTML = '';
  const sv = load();
  stage(`<div class="menu"><h1 class="logo">LIFE</h1><div class="sub">your story</div>
   <p class="tagline">Dezoito anos, uma mala e uma cidade inteira por descobrir. Cada decisão deixa uma marca, e ninguém vive a mesma história.</p>
   <div class="row">${sv && sv.name ? `<button class="btn" onclick="continueGame()">Continuar a vida de ${sv.name}</button>` : ''}
   <button class="btn ${sv ? 'ghost' : ''}" onclick="showSetup()">Nova vida</button></div>
   <p class="note">Protótipo experimental · salvamento automático neste navegador</p></div>`);
}

function showSetup() {
  pick = [];
  stage(`<div class="setup"><p class="prologue">Dezoito anos. Uma mala, R$ 1.500 no bolso e uma cidade que ainda não sabe seu nome. Ninguém mais vai dizer o que fazer daqui para a frente, e é isso que assusta e empolga ao mesmo tempo. Quem você vai ser?</p>
   <div class="fld"><label for="nm">Como você se chama?</label><input type="text" id="nm" maxlength="18" placeholder="Seu nome" autocomplete="off"></div>
   <div class="fld"><label>Escolha 2 traços de personalidade <span id="cnt">(0/2)</span></label>
   <div class="traits">${Object.keys(TRAITS).map(k => `<button class="tr" id="t_${k}" onclick="togTrait('${k}')">${TRAITS[k][0]}<small>${TRAITS[k][1]}</small></button>`).join('')}</div></div>
   <div class="row"><button class="btn" id="go" onclick="startGame()" disabled>Começar a jornada</button><button class="btn ghost" onclick="showMenu()">Voltar</button></div></div>`);
}
function togTrait(k) {
  const i = pick.indexOf(k);
  if (i > -1) pick.splice(i, 1); else if (pick.length < 2) pick.push(k);
  Object.keys(TRAITS).forEach(x => $('#t_' + x).classList.toggle('on', pick.includes(x)));
  $('#cnt').textContent = `(${pick.length}/2)`;
  $('#go').disabled = pick.length < 2;
}
function startGame() {
  if (pick.length < 2) return;
  const name = ($('#nm').value || '').replace(/[<>&"'`]/g, '').trim() || 'Alex';
  newGame(name, pick.slice());
}
function continueGame() {
  const sv = load(); if (!sv) return showMenu();
  S = sv; buildHud();
  if (S.phase === 'end') showEnd(); else if (S.phase === 'result') showResult(); else showScene();
}

function showScene() {
  const sc = SC[S.cur], ops = opsOf(sc);
  stage(`<div class="scene"><div class="cap">${sc.cap}</div>
  <div class="narr">${sc.who ? `<div class="npc"><span>${sc.who[0]}</span>${sc.who}</div>` : ''}<p>${sc.txt(S)}</p></div>
  <div class="ask">O que você faz?</div>
  <div class="ops">${ops.map((c, i) => { const lk = lock(c);
    return `<button class="op" style="--i:${i}" ${lk ? 'disabled' : ''} onclick="choose(${i})"><b>${'ABCD'[i]}</b><span><strong>${c.t}</strong>${c.d ? `<small>${c.d}</small>` : ''}${lk ? `<em class="lk">Requer ${lk}</em>` : c.roll ? `<em>Resultado incerto, depende de ${ST[c.roll.st]}</em>` : ''}</span></button>`;
  }).join('')}</div></div>`);
}

function showResult() {
  const r = S.res, sign = v => (v > 0 ? '+' : '−');
  stage(`<div class="scene"><div class="cap">${SC[S.cur].cap}</div><div class="pick">Você escolheu: ${r.pick}</div>
  <div class="narr"><p>${r.txt}</p></div>
  ${r.tag ? `<div class="tag ${r.ok ? 'ok' : 'no'}">${r.tag}</div>` : ''}
  <div class="chips">${r.deltas.map(d => `<span class="chip ${d.v > 0 ? 'up' : 'dn'}">${d.l} ${sign(d.v)}${d.money ? R(Math.abs(d.v)) : Math.abs(d.v)}</span>`).join('')}</div>
  ${r.mo ? `<div class="bal">Passam-se ${r.mo} ${r.mo === 1 ? 'mês' : 'meses'}. Saldo do período: ${sign(r.bal)}${R(Math.abs(r.bal))}</div>` : '<div class="bal"></div>'}
  <button class="go" onclick="next()">Continuar</button></div>`);
}

// Final: monta o epílogo a partir das escolhas e dos atributos
function epilogue() {
  const f = S.flags, p = [];
  p.push({career:'Você mergulhou na carreira, e hoje seu nome abre portas antes mesmo de você bater.',
    people:'Você escolheu as pessoas, e a casa onde mora raramente fica vazia aos domingos.',
    learn:'Você escolheu aprender, e a curiosidade virou seu maior patrimônio.',
    free:'Você escolheu recomeçar longe. Algumas coisas ficaram para trás; outras vieram junto na mala.'}[f.dir]);
  if (S.job) p.push(`No trabalho, você é ${S.job.t.toLowerCase()}, ganhando ${R(S.job.s)} por mês.`);
  if (f.biaStays) p.push('Bia ficou, e vocês ainda estão descobrindo o que isso significa. Parece um bom começo.');
  else if (f.biaPlan) p.push('Você e Bia têm um plano e uma data riscada no calendário.');
  else if (f.biaAway) p.push('Bia seguiu para Curitiba. Vocês trocam mensagens de madrugada, e nenhum dos dois sabe ainda o final.');
  else if (S.rel.bia > 0) p.push('Bia virou uma lembrança boa de uma cidade que você aprendeu a chamar de sua.');
  const m = {paid:'Marcos pagou o que devia, e a amizade ficou mais forte do que antes.', forgiven:'Marcos nunca esqueceu que você perdoou a dívida. Hoje ele é o primeiro a aparecer quando você precisa.', gone:'Marcos virou um nome antigo na lista de contatos. Há dívidas que o dinheiro não cobre.'}[f.marcos];
  if (m) p.push(m);
  const mom = {helped:'O telhado da casa da sua mãe foi refeito, e ela ainda guarda o comprovante numa gaveta.', partial:'Você ajudou sua mãe como pôde, e o telhado foi consertado aos poucos.', visited:'Sua mãe ainda conta a história do filho (ou filha) que apareceu para ajudar com as próprias mãos.', refused:'Você e sua mãe quase não falam desse telefonema. Há silêncios que ocupam mais espaço do que palavras.'}[f.mom];
  if (mom) p.push(mom);
  p.push(S.money >= 5000 ? `Com ${R(S.money)} guardados, você tem algo raro: tempo para escolher.` : S.money < 0 ? `Você carrega ${R(-S.money)} em dívidas. É um peso, mas também uma lição.` : `Seu saldo é de ${R(S.money)}, sem luxos, mas sem sufoco.`);
  return p.filter(Boolean).join('</p><p>');
}

function showEnd() {
  S.phase = 'end'; save();
  const top = Object.keys(ST).reduce((a, b) => S.st[a] >= S.st[b] ? a : b);
  const title = {int:'O Estrategista', car:'O Conector', sau:'O Resiliente', dis:'O Construtor', fel:'O Sonhador', rep:'A Referência'}[top];
  const mine = ACH.filter(a => S.ach.includes(a[0]));
  $('#hud').innerHTML = '';
  stage(`<div class="end"><div class="cap">Fim do prólogo · ${S.age} anos</div><h2>${S.name}, ${title}</h2>
  <div class="sum">${S.n} decisões · ${Math.floor(S.t / 12)} anos e ${S.t % 12} meses de história</div>
  <div class="narr"><p>${epilogue()}</p></div>
  <h3>Quem você se tornou</h3>
  <div class="stats" style="margin-bottom:24px">${Object.keys(ST).map(k => `<div class="st"><label>${ST[k]}<em>${S.st[k]}</em></label><i><u style="width:${S.st[k]}%"></u></i></div>`).join('')}</div>
  <h3>Conquistas (${mine.length}/${ACH.length})</h3>
  <div class="ach">${mine.length ? mine.map(a => `<div><b>${a[1]}</b><span>${a[2]}</span></div>`).join('') : '<span class="note">Nenhuma desta vez. Outra vida, outras chances.</span>'}</div>
  <div class="row"><button class="btn" onclick="showSetup()">Viver outra história</button><button class="btn ghost" onclick="showMenu()">Menu</button></div></div>`);
}

/* ---------- Início ---------- */
showMenu();
