import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, getDoc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCZMJdlBY-Yk2Wwlpp5ySQd3OXUaDqHXZA",
    authDomain: "ponto-certo-do-amendoim.firebaseapp.com",
    projectId: "ponto-certo-do-amendoim",
    storageBucket: "ponto-certo-do-amendoim.appspot.com",
    messagingSenderId: "163202675379",
    appId: "1:163202675379:web:9c87936fd90ee8e8c076c6",
    measurementId: "G-L3LC5BF6WY"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Referências aos elementos
const btnAdicionar = document.getElementById("btnAdicionar");
const btnPesquisar = document.getElementById("btnPesquisar");
const formAdicionar = document.getElementById("formAdicionarProduto");
const formEditar = document.getElementById("formEditarProduto");
const btnLupa = document.getElementById("btnLupa");

let termoPesquisa = "";

document.addEventListener('DOMContentLoaded', () => {
    const btnFecharAdicionar = document.getElementById('btnFecharAdicionar');
    const btnFecharEditar = document.getElementById('btnFecharEditar');
    const btnFecharPesquisa = document.getElementById('btnFecharPopup');

    function fecharPopup(popupId) {
        const popup = document.getElementById(popupId);
        if (popup) {
            popup.style.display = 'none';
            const form = popup.querySelector("form");
            if (form) form.reset();
        }
    }

    btnFecharAdicionar.addEventListener('click', () => fecharPopup('popupAdicionar'));
    btnFecharEditar.addEventListener('click', () => fecharPopup('popupEditar'));
    btnFecharPesquisa.addEventListener('click', () => fecharPopup('popupPesquisa'));
});

// Função para converter peso inserido (kg ou g) para gramas
function converterPesoParaGramas(pesoStr) {
    const peso = pesoStr.toString().toLowerCase();
    if (peso.includes("kg")) {
        return parseFloat(peso.replace("kg", "")) * 1000; // Converte kg para g
    }
    return parseFloat(peso.replace("g", "")); // Assume gramas se não especificado
}

// Função para formatar peso para exibição
function formatarPeso(peso) {
    if (peso >= 1000) {
        return `${(peso / 1000).toFixed(2)}kg`; // Exibe em kg se >= 1000g
    }
    return `${peso}g`; // Exibe em gramas
}

// Função para carregar produtos
async function carregarProdutos() {
    try {
        console.log("Carregando produtos...");
        const tbody = document.querySelector("#tabelaProdutos tbody");
        tbody.innerHTML = "";
        const querySnapshot = await getDocs(collection(db, "produtos"));
        const produtos = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const produto = {
                id: doc.id,
                nome: data.nome,
                peso: data.peso, // Peso em gramas no banco
                fabricacao: data.fabricacao,
                validade: data.validade,
                valor: data.valor,
                proximo: validadeProxima(data.validade),
                pesoBaixo: pesoBaixo(data.peso)
            };
            produtos.push(produto);
        });

        produtos.sort((a, b) => {
            const aCritico = a.proximo || a.pesoBaixo;
            const bCritico = b.proximo || b.pesoBaixo;

            if (aCritico && !bCritico) return -1;
            if (!aCritico && bCritico) return 1;
            if (aCritico && bCritico) {
                if (a.proximo && a.pesoBaixo && !(b.proximo && b.pesoBaixo)) return -1;
                if (b.proximo && b.pesoBaixo && !(a.proximo && a.pesoBaixo)) return 1;
            }
            return a.nome.localeCompare(b.nome);
        });

        produtos.forEach(produto => {
            const tr = document.createElement("tr");
            const validadeStyle = produto.proximo ? 'style="color: red;"' : '';
            const pesoStyle = produto.pesoBaixo ? 'style="color: red;"' : '';

            tr.innerHTML = `
                <td>${produto.nome}</td>
                <td ${pesoStyle}>${formatarPeso(produto.peso)}</td>
                <td>${formatarData(produto.fabricacao)}</td>
                <td ${validadeStyle}>${formatarData(produto.validade)}</td>
                <td>${produto.valor}</td>
                <td>
                    <button class="btnEditar" data-id="${produto.id}">Editar ✏️</button>
                    <button class="btnExcluir" data-id="${produto.id}">Excluir 🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        reatribuirEventos();

    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
    }
}

// Funções de validação
function validadeProxima(validade) {
    const hoje = new Date();
    const validadeDate = new Date(validade);
    if (isNaN(validadeDate)) return false;
    const diffDays = (validadeDate - hoje) / (1000 * 3600 * 24);
    return diffDays <= 90 && diffDays >= 0;
}

function pesoBaixo(peso) {
    return peso < 300; // Menos de 300g
}

function formatarData(data) {
    const [ano, mes, dia] = data.split("-");
    return `${dia}-${mes}-${ano}`;
}

function reatribuirEventos() {
    console.log("Reatribuindo eventos aos botões...");
    document.querySelectorAll(".btnEditar").forEach(btn => {
        btn.removeEventListener("click", editarProduto);
        btn.addEventListener("click", editarProduto);
    });
    document.querySelectorAll(".btnExcluir").forEach(btn => {
        btn.removeEventListener("click", excluirProduto);
        btn.addEventListener("click", excluirProduto);
    });
}

btnAdicionar.addEventListener("click", () => {
    document.getElementById("popupAdicionar").style.display = "block";
});

formAdicionar.addEventListener("submit", async (event) => {
    event.preventDefault();
    const produto = {
        nome: document.getElementById("nomeProduto").value,
        peso: converterPesoParaGramas(document.getElementById("pesoProduto").value),
        fabricacao: document.getElementById("fabricacaoProduto").value,
        validade: document.getElementById("validadeProduto").value,
        valor: parseFloat(document.getElementById("valorProduto").value)
    };

    await addDoc(collection(db, "produtos"), produto);
    alert("Produto adicionado com sucesso!");
    formAdicionar.reset();
    document.getElementById("popupAdicionar").style.display = "none";
    carregarProdutos();
});

btnPesquisar.addEventListener("click", () => {
    document.getElementById("popupPesquisa").style.display = "block";
});

btnLupa.addEventListener("click", async () => {
    termoPesquisa = document.getElementById("campoPesquisa").value.toLowerCase();
    const tbody = document.querySelector("#tabelaProdutos tbody");
    tbody.innerHTML = "";

    if (termoPesquisa.trim() === "") {
        carregarProdutos();
        return;
    }

    const querySnapshot = await getDocs(collection(db, "produtos"));
    const produtosFiltrados = [];

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.nome.toLowerCase().includes(termoPesquisa)) {
            produtosFiltrados.push({ id: doc.id, ...data });
        }
    });

    produtosFiltrados.forEach(data => {
        const tr = document.createElement("tr");
        const validadeStyle = validadeProxima(data.validade) ? 'style="color: red;"' : '';
        const pesoStyle = pesoBaixo(data.peso) ? 'style="color: red;"' : '';

        tr.innerHTML = `
            <td>${data.nome}</td>
            <td ${pesoStyle}>${formatarPeso(data.peso)}</td>
            <td>${formatarData(data.fabricacao)}</td>
            <td ${validadeStyle}>${formatarData(data.validade)}</td>
            <td>${data.valor}</td>
            <td>
                <button class="btnEditar" data-id="${data.id}">✏️</button>
                <button class="btnExcluir" data-id="${data.id}">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    reatribuirEventos();
});

async function editarProduto(event) {
    const id = event.target.dataset.id;
    const docRef = doc(db, "produtos", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        document.getElementById("nomeProdutoEditar").value = data.nome;
        document.getElementById("pesoProdutoEditar").value = formatarPeso(data.peso);
        document.getElementById("fabricacaoProdutoEditar").value = data.fabricacao;
        document.getElementById("validadeProdutoEditar").value = data.validade;
        document.getElementById("valorProdutoEditar").value = data.valor;

        formEditar.dataset.id = id;
        document.getElementById("popupEditar").style.display = "block";
    } else {
        alert("Produto não encontrado!");
    }
}

formEditar.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = formEditar.dataset.id;
    const produto = {
        nome: document.getElementById("nomeProdutoEditar").value,
        peso: converterPesoParaGramas(document.getElementById("pesoProdutoEditar").value),
        fabricacao: document.getElementById("fabricacaoProdutoEditar").value,
        validade: document.getElementById("validadeProdutoEditar").value,
        valor: parseFloat(document.getElementById("valorProdutoEditar").value)
    };

    const docRef = doc(db, "produtos", id);
    await updateDoc(docRef, produto);
    alert("Produto editado com sucesso!");
    formEditar.reset();
    document.getElementById("popupEditar").style.display = "none";
    carregarProdutos();
});

async function excluirProduto(event) {
    const id = event.target.dataset.id;
    const docRef = doc(db, "produtos", id);
    await deleteDoc(docRef);
    alert("Produto excluído com sucesso!");
    carregarProdutos();
}

carregarProdutos();