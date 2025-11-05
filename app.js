// Storage helpers
const storage = {
	get(key, fallback) {
		try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
	},
	set(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
};

function toMonthKey(date) {
	const d = new Date(date);
	return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }

// Defaults
const DEFAULT_ITEMS = [
	{ name: 'Maintenance payment', amount: 4537, image: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=1200&q=80&auto=format&fit=crop' },
	{ name: 'Watercan', amount: 80, image: 'https://images.unsplash.com/photo-1528909514045-2fa4ac7a08ba?w=1200&q=80&auto=format&fit=crop' },
	{ name: 'Mobile Recharge', amount: 549, image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200&q=80&auto=format&fit=crop' },
	{ name: 'Groceries', amount: 0, image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80&auto=format&fit=crop' },
	{ name: 'Petrol', amount: 0, image: 'https://images.unsplash.com/photo-1542367597-8849eb47a1ac?w=1200&q=80&auto=format&fit=crop' },
	{ name: 'Iron', amount: 0, image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1200&q=80&auto=format&fit=crop' },
];

// State
let menuItems = storage.get('menuItems', null);
let transactions = storage.get('transactions', null);

if (!Array.isArray(menuItems) || menuItems.length === 0) {
	menuItems = DEFAULT_ITEMS.map(x => ({ id: uid(), name: x.name, amount: Number(x.amount)||0, image: x.image||'' }));
	storage.set('menuItems', menuItems);
}
if (!Array.isArray(transactions)) {
	transactions = [];
	storage.set('transactions', transactions);
}

// Theme preference
const THEME_KEY = 'themePref';
function applyTheme(theme) {
	document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
}
const storedTheme = storage.get(THEME_KEY, null);
const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
applyTheme(storedTheme ?? (prefersDark ? 'dark' : 'light'));

// DOM refs
const tabs = document.querySelectorAll('.tab-btn');
const panels = {
	menu: document.getElementById('tab-menu'),
	transactions: document.getElementById('tab-transactions'),
};
const menuGrid = document.getElementById('menu-grid');
const openAddItemBtn = document.getElementById('open-add-item');
const themeToggle = document.getElementById('theme-toggle');

const txMonthInput = document.getElementById('tx-month');
const txTbody = document.getElementById('transactions-tbody');
const txEmpty = document.getElementById('transactions-empty');
const txGrandTotal = document.getElementById('grand-total');
const btnReport = document.getElementById('btn-generate-report');
const btnPdf = document.getElementById('btn-export-pdf');
const btnClearMonth = document.getElementById('btn-clear-month');
const reportView = document.getElementById('report-view');

// Modals and forms
const itemModal = document.getElementById('item-modal');
const itemModalTitle = document.getElementById('item-modal-title');
const itemModalClose = document.getElementById('item-modal-close');
const itemForm = document.getElementById('item-form');
const itemId = document.getElementById('item-id');
const itemName = document.getElementById('item-name');
const itemAmount = document.getElementById('item-amount');
const itemImage = document.getElementById('item-image');
const itemCancel = document.getElementById('item-cancel');

const confirmModal = document.getElementById('confirm-modal');
const confirmMessage = document.getElementById('confirm-message');
const confirmOk = document.getElementById('confirm-ok');
const confirmCancel = document.getElementById('confirm-cancel');
const confirmClose = document.getElementById('confirm-close');

// Tabs behavior
tabs.forEach(btn => {
	btn.addEventListener('click', () => {
		tabs.forEach(b => b.classList.remove('active'));
		btn.classList.add('active');
		const tab = btn.dataset.tab;
		Object.values(panels).forEach(p => p.classList.remove('active'));
		panels[tab].classList.add('active');
	});
});

// Theme toggle
function currentTheme() { return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
function updateThemeToggleIcon() {
	if (!themeToggle) return;
	themeToggle.textContent = currentTheme() === 'dark' ? '🌞' : '🌙';
}
themeToggle?.addEventListener('click', () => {
	const next = currentTheme() === 'dark' ? 'light' : 'dark';
	applyTheme(next);
	storage.set(THEME_KEY, next);
	updateThemeToggleIcon();
});
updateThemeToggleIcon();

// Month default
const now = new Date();
const defaultMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
txMonthInput.value = defaultMonth;

// Rendering
function renderMenu() {
	menuGrid.innerHTML = '';
	menuItems.forEach(item => {
		const card = document.createElement('div');
		card.className = 'card';
		const img = document.createElement('img');
		img.className = 'card-img';
		img.src = item.image || 'https://images.unsplash.com/photo-1520975930463-3b3c5d1036d3?w=1200&q=80&auto=format&fit=crop';
		img.alt = item.name;
		img.onerror = () => { img.src = 'https://images.unsplash.com/photo-1520975930463-3b3c5d1036d3?w=1200&q=80&auto=format&fit=crop'; };

		const body = document.createElement('div');
		body.className = 'card-body';
		const title = document.createElement('div');
		title.className = 'card-title';
		const h3 = document.createElement('h3');
		h3.textContent = item.name;
		const price = document.createElement('div');
		price.className = 'price';
		price.textContent = `Rs. ${Number(item.amount||0).toLocaleString('en-IN')}`;
		title.appendChild(h3);
		title.appendChild(price);

		const actions = document.createElement('div');
		actions.className = 'card-actions';
		const addBtn = document.createElement('button');
		addBtn.className = 'btn primary';
		addBtn.textContent = 'Add to Transactions';
		addBtn.addEventListener('click', () => addToTransactions(item));
		const editBtn = document.createElement('button');
		editBtn.className = 'btn';
		editBtn.textContent = 'Edit';
		editBtn.addEventListener('click', () => openItemModal(item));
		const delBtn = document.createElement('button');
		delBtn.className = 'btn danger';
		delBtn.textContent = 'Delete';
		delBtn.addEventListener('click', () => confirmDeleteItem(item.id));
		actions.append(addBtn, editBtn, delBtn);

		body.appendChild(title);
		body.appendChild(actions);

		card.appendChild(img);
		card.appendChild(body);
		menuGrid.appendChild(card);
	});
}

function getMonthTransactions(monthKey) {
	return transactions.filter(t => t.monthKey === monthKey);
}

function renderTransactions() {
	const monthKey = txMonthInput.value;
	const list = getMonthTransactions(monthKey);
	txTbody.innerHTML = '';
	let total = 0;
	if (list.length === 0) {
		txEmpty.classList.remove('hidden');
	} else {
		txEmpty.classList.add('hidden');
	}
	list.forEach((t, idx) => {
		const tr = document.createElement('tr');
		const lineTotal = (Number(t.amount)||0) * (Number(t.qty)||1);
		total += lineTotal;
		tr.innerHTML = `
			<td>${idx+1}</td>
			<td>${escapeHtml(t.name)}</td>
			<td>Rs. ${Number(t.amount).toLocaleString('en-IN')}</td>
			<td>
				<input type="number" min="1" step="1" value="${t.qty}" data-id="${t.id}" class="qty-input" />
			</td>
			<td>Rs. ${lineTotal.toLocaleString('en-IN')}</td>
			<td>${new Date(t.dateISO).toLocaleDateString('en-IN')}</td>
			<td>
				<button class="icon-btn" title="Remove" data-remove="${t.id}">🗑️</button>
			</td>
		`;
		txTbody.appendChild(tr);
	});
	// attach qty listeners and remove
	[...txTbody.querySelectorAll('.qty-input')].forEach(input => {
		input.addEventListener('change', () => {
			const id = input.getAttribute('data-id');
			const val = Math.max(1, Number(input.value)||1);
			input.value = String(val);
			const idx = transactions.findIndex(x => x.id === id);
			if (idx >= 0) {
				transactions[idx].qty = val;
				storage.set('transactions', transactions);
				renderTransactions();
			}
		});
	});
	[...txTbody.querySelectorAll('button[data-remove]')].forEach(btn => {
		btn.addEventListener('click', () => {
			const id = btn.getAttribute('data-remove');
			transactions = transactions.filter(x => x.id !== id);
			storage.set('transactions', transactions);
			renderTransactions();
		});
	});
	
	txGrandTotal.textContent = total.toLocaleString('en-IN');
}

// Actions
function addToTransactions(item) {
	const dateISO = new Date().toISOString();
	const tx = {
		id: uid(),
		itemId: item.id,
		name: item.name,
		amount: Number(item.amount)||0,
		qty: 1,
		dateISO,
		monthKey: toMonthKey(dateISO),
	};
	transactions.push(tx);
	storage.set('transactions', transactions);
	// Switch to Transactions tab and render the current month
	tabs.forEach(b => b.classList.remove('active'));
	document.querySelector('.tab-btn[data-tab="transactions"]').classList.add('active');
	Object.values(panels).forEach(p => p.classList.remove('active'));
	panels.transactions.classList.add('active');
	const txMonthOfNew = tx.monthKey;
	txMonthInput.value = txMonthOfNew;
	renderTransactions();
}

function openItemModal(item) {
	itemModal.classList.remove('hidden');
	itemModal.setAttribute('aria-hidden','false');
	if (item) {
		itemModalTitle.textContent = 'Edit Menu Item';
		itemId.value = item.id;
		itemName.value = item.name;
		itemAmount.value = Number(item.amount)||0;
		itemImage.value = item.image||'';
	} else {
		itemModalTitle.textContent = 'Add Menu Item';
		itemId.value = '';
		itemName.value = '';
		itemAmount.value = '';
		itemImage.value = '';
	}
	setTimeout(() => itemName.focus(), 0);
}

function closeItemModal() {
	itemModal.classList.add('hidden');
	itemModal.setAttribute('aria-hidden','true');
}

function confirmDeleteItem(id) {
	openConfirm('Delete this menu item? This does not remove existing transactions.', () => {
		menuItems = menuItems.filter(m => m.id !== id);
		storage.set('menuItems', menuItems);
		renderMenu();
	});
}

function openConfirm(message, onOk) {
	confirmMessage.textContent = message;
	confirmModal.classList.remove('hidden');
	confirmModal.setAttribute('aria-hidden','false');
	const okHandler = () => { onOk?.(); closeConfirm(); };
	confirmOk.addEventListener('click', okHandler, { once: true });
	function closeConfirm() {
		confirmModal.classList.add('hidden');
		confirmModal.setAttribute('aria-hidden','true');
		confirmOk.removeEventListener('click', okHandler);
	}
	confirmCancel.onclick = closeConfirm;
	confirmClose.onclick = closeConfirm;
}

// Item form handlers
openAddItemBtn.addEventListener('click', () => openItemModal());
itemModalClose.addEventListener('click', closeItemModal);
itemCancel.addEventListener('click', closeItemModal);

itemForm.addEventListener('submit', (e) => {
	e.preventDefault();
	const name = itemName.value.trim();
	const amount = Number(itemAmount.value);
	const image = itemImage.value.trim();
	if (!name) return;
	if (!(amount >= 0)) { alert('Amount must be a number ≥ 0'); return; }
	const id = itemId.value;
	if (id) {
		const idx = menuItems.findIndex(x => x.id === id);
		if (idx >= 0) {
			menuItems[idx] = { ...menuItems[idx], name, amount, image };
		}
	} else {
		menuItems.push({ id: uid(), name, amount, image });
	}
	storage.set('menuItems', menuItems);
	closeItemModal();
	renderMenu();
});

// Transactions handlers
txMonthInput.addEventListener('change', () => {
	renderTransactions();
});

btnClearMonth.addEventListener('click', () => {
	const monthKey = txMonthInput.value;
	openConfirm(`Clear all transactions for ${monthKey}?`, () => {
		transactions = transactions.filter(t => t.monthKey !== monthKey);
		storage.set('transactions', transactions);
		renderTransactions();
	});
});

btnReport.addEventListener('click', () => {
	const monthKey = txMonthInput.value;
	const list = getMonthTransactions(monthKey);
	const total = list.reduce((s, t) => s + (Number(t.amount)||0) * (Number(t.qty)||1), 0);
	reportView.classList.remove('hidden');
	reportView.innerHTML = `
		<h3>Monthly Expense Report - ${monthKey}</h3>
		<p>Generated: ${new Date().toLocaleString('en-IN')}</p>
		<div class="table-responsive">
		<table class="table">
			<thead>
				<tr>
					<th>#</th><th>Item</th><th>Unit (Rs.)</th><th>Qty</th><th>Total (Rs.)</th><th>Date</th>
				</tr>
			</thead>
			<tbody>
				${list.map((t, i) => {
					const lt = (Number(t.amount)||0) * (Number(t.qty)||1);
					return `<tr><td>${i+1}</td><td>${escapeHtml(t.name)}</td><td>Rs. ${Number(t.amount).toLocaleString('en-IN')}</td><td>${t.qty}</td><td>Rs. ${lt.toLocaleString('en-IN')}</td><td>${new Date(t.dateISO).toLocaleDateString('en-IN')}</td></tr>`;
				}).join('')}
			</tbody>
			<tfoot>
				<tr><td colspan="4" class="text-right">Grand Total</td><td>Rs. ${total.toLocaleString('en-IN')}</td><td></td></tr>
			</tfoot>
		</table>
		</div>
	`;
});

btnPdf.addEventListener('click', () => {
	const monthKey = txMonthInput.value;
	const list = getMonthTransactions(monthKey);
	const rows = list.map((t, i) => [
		i+1,
		t.name,
		Number(t.amount).toLocaleString('en-IN'),
		t.qty,
		((Number(t.amount)||0)*(Number(t.qty)||1)).toLocaleString('en-IN'),
		new Date(t.dateISO).toLocaleDateString('en-IN'),
	]);
	const total = list.reduce((s, t) => s + (Number(t.amount)||0) * (Number(t.qty)||1), 0);
	const { jsPDF } = window.jspdf;
	const doc = new jsPDF();
	const title = `Monthly Expense Report - ${monthKey}`;
	doc.setFontSize(14);
	doc.text(title, 14, 16);
	doc.setFontSize(10);
	doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 22);
	// table
	doc.autoTable({
		startY: 26,
		head: [['#','Item','Unit (Rs.)','Qty','Total (Rs.)','Date']],
		body: rows,
		styles: { fontSize: 10 },
		columnStyles: { 0:{cellWidth:8}, 1:{cellWidth:60}, 2:{cellWidth:25}, 3:{cellWidth:12}, 4:{cellWidth:28}, 5:{cellWidth:28} }
	});
	let finalY = doc.lastAutoTable.finalY || 26;
	doc.setFontSize(12);
	doc.text(`Grand Total: Rs. ${total.toLocaleString('en-IN')}`, 14, finalY + 10);
	doc.save(`expenses-${monthKey}.pdf`);
});

// Utils
function escapeHtml(s) {
	return String(s).replace(/[&<>"]+/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

// Initial render
renderMenu();
renderTransactions();


