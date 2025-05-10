import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

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

document.addEventListener('DOMContentLoaded', async function () {
    const tabelaVendas = document.getElementById('tabelaVendas');
    const valorPago = document.getElementById('valorPago');
    const totalVenda = document.getElementById('totalVenda');
    const troco = document.getElementById('troco');
    const btnFinalizarVenda = document.getElementById('finalizarVenda');
    const campoPesquisa = document.getElementById('campoPesquisa');
    const btnPesquisar = document.getElementById('btnPesquisar');
    const sugestoesContainer = document.createElement('div');
    sugestoesContainer.id = 'sugestoes';
    campoPesquisa.parentNode.insertBefore(sugestoesContainer, campoPesquisa.nextSibling);

    let produtosVendas = [];
    let itensSelecionados = [];

    async function carregarProdutos() {
        const querySnapshot = await getDocs(collection(db, "produtos"));
        produtosVendas = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            produtosVendas.push({
                id: doc.id,
                nome: data.nome,
                peso: data.peso, // Estoque em gramas (ex.: 2000g)
                valor: data.valor // Valor por unidade (ex.: R$ por kg)
            });
        });
    }

    function adicionarProduto(produto) {
        if (!itensSelecionados.some(item => item.id === produto.id)) {
            itensSelecionados.push({ ...produto, quantidade: 0 });
            atualizarTabela();
            campoPesquisa.value = '';
            sugestoesContainer.innerHTML = '';
        } else {
            alert('Produto já adicionado à lista!');
        }
    }

    function atualizarSugestoes() {
        const termo = campoPesquisa.value.toLowerCase().trim();
        sugestoesContainer.innerHTML = '';

        if (termo === '') return;

        const produtosFiltrados = produtosVendas.filter(produto => 
            produto.nome.toLowerCase().includes(termo)
        );

        if (produtosFiltrados.length === 0) {
            sugestoesContainer.innerHTML = '<p>Nenhum produto encontrado</p>';
            return;
        }

        produtosFiltrados.forEach(produto => {
            const div = document.createElement('div');
            div.textContent = `${produto.nome} (${produto.peso}g) - R$ ${produto.valor.toFixed(2)}`;
            div.style.cursor = 'pointer';
            div.style.padding = '5px';
            div.style.borderBottom = '1px solid #ccc';
            div.addEventListener('click', () => adicionarProduto(produto));
            sugestoesContainer.appendChild(div);
        });
    }

    function atualizarTabela() {
        tabelaVendas.innerHTML = '';
        itensSelecionados.forEach((produto, index) => {
            const row = tabelaVendas.insertRow();
            row.insertCell(0).textContent = produto.nome;
            row.insertCell(1).textContent = `${produto.peso}g`;
            row.insertCell(2).textContent = `R$ ${produto.valor.toFixed(2)}`; // Valor por kg
            
            const inputQuantidade = document.createElement('input');
            inputQuantidade.type = 'number';
            inputQuantidade.min = '0';
            inputQuantidade.max = (produto.peso / 1000).toString(); // Converte gramas para kg
            inputQuantidade.step = '0.100'; // Permite decimais (ex.: 0.800 kg)
            inputQuantidade.value = (produto.quantidade).toFixed(3); 
            const cellQuantidade = row.insertCell(3);
            cellQuantidade.appendChild(inputQuantidade);
            
            const cellSubtotal = row.insertCell(4);
            cellSubtotal.textContent = `R$ ${(produto.quantidade * produto.valor / 1000).toFixed(2)}`; // Subtotal em kg
            
            const cellRemover = row.insertCell(5);
            const btnRemover = document.createElement('button');
            btnRemover.textContent = 'Remover';
            btnRemover.addEventListener('click', () => {
                itensSelecionados.splice(index, 1);
                atualizarTabela();
            });
            cellRemover.appendChild(btnRemover);

            inputQuantidade.addEventListener('input', function () {
                let quantidadeKg = parseFloat(this.value) || 0; // Quantidade em kg
                let quantidadeGramas = quantidadeKg * 1000; // Converte para gramas
                
                if (quantidadeGramas > produto.peso) {
                    alert('Quantidade superior ao estoque disponível!');
                    this.value = (produto.peso / 1000).toFixed(3); // Limita ao estoque em kg
                    quantidadeGramas = produto.peso;
                }
                produto.quantidade = quantidadeGramas; // Armazena em gramas
                cellSubtotal.textContent = `R$ ${(quantidadeGramas * produto.valor / 1000).toFixed(2)}`;
                calcularTotal();
            });
            row.dataset.id = produto.id;
        });
        calcularTotal();
    }

    function calcularTotal() {
        let total = 0;
        itensSelecionados.forEach(produto => {
            total += (produto.quantidade * produto.valor) / 1000; // Converte gramas para kg no cálculo
        });
        totalVenda.textContent = total.toFixed(2);
    }

    valorPago.addEventListener('input', function () {
        const pago = parseFloat(valorPago.value) || 0;
        const total = parseFloat(totalVenda.textContent);
        troco.textContent = (pago - total).toFixed(2);
    });

    btnFinalizarVenda.addEventListener('click', async function () {
        const total = parseFloat(totalVenda.textContent);
        const pago = parseFloat(valorPago.value) || 0;
        
        if (itensSelecionados.length === 0) {
            alert('Adicione pelo menos um produto antes de finalizar!');
            return;
        }
        
        if (pago < total) {
            alert('Valor insuficiente para concluir a compra!');
            return;
        }

        const venda = {
            produtos: itensSelecionados.map(produto => ({
                nome: produto.nome,
                quantidade: produto.quantidade, // Quantidade em gramas
                subtotal: (produto.quantidade * produto.valor) / 1000 // Subtotal em reais
            })),
            total: total,
            data: new Date().toISOString()
        };

        for (const produto of itensSelecionados) {
            const produtoRef = doc(db, "produtos", produto.id);
            await updateDoc(produtoRef, {
                peso: produto.peso - produto.quantidade // Atualiza estoque em gramas
            });
        }

        await addDoc(collection(db, "vendas"), venda);

        alert('Venda concluída com sucesso!');
        itensSelecionados = [];
        valorPago.value = '';
        totalVenda.textContent = '0.00';
        troco.textContent = '0.00';
        tabelaVendas.innerHTML = '';
        await carregarProdutos();
    });

    campoPesquisa.addEventListener('input', atualizarSugestoes);

    btnPesquisar.addEventListener('click', () => {
        const termo = campoPesquisa.value.toLowerCase();
        const produtoEncontrado = produtosVendas.find(produto => produto.nome.toLowerCase().includes(termo));
        if (produtoEncontrado) {
            adicionarProduto(produtoEncontrado);
        } else {
            alert('Produto não encontrado!');
        }
    });

    await carregarProdutos();
});