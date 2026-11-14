
// ==================================
// INVOICE MANAGEMENT SYSTEM
// ==================================

// Store data in browser local storage

let customers = JSON.parse(localStorage.getItem("customers")) || [];
let products = JSON.parse(localStorage.getItem("products")) || [];
let invoices = JSON.parse(localStorage.getItem("invoices")) || [];
let payments = JSON.parse(localStorage.getItem("payments")) || [];

let itemCounter = 0;

const money = amount =>
    "₹" + Number(amount).toFixed(2);

const today = () => new Date().toISOString().split("T")[0];

function saveData() {
    localStorage.setItem("customers", JSON.stringify(customers));
    localStorage.setItem("products", JSON.stringify(products));
    localStorage.setItem("invoices", JSON.stringify(invoices));
    localStorage.setItem("payments", JSON.stringify(payments));
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// ==================================
// NAVIGATION
// ==================================

function showPage(pageId) {

    document.querySelectorAll(".page").forEach(page => {
        page.classList.add("hidden");
    });

    document.getElementById(pageId).classList.remove("hidden");

    const titles = {
        dashboard: "Dashboard",
        customers: "Customers",
        products: "Products",
        invoices: "Invoices",
        payments: "Payments",
        reports: "Reports"
    };

    document.getElementById("pageTitle").textContent = titles[pageId];

    refreshAll();
}

// ==================================
// CUSTOMER MANAGEMENT
// ==================================

document.getElementById("customerForm").addEventListener("submit", function(e) {

    e.preventDefault();

    const editId = document.getElementById("customerEditId").value;

    const customer = {
        id: editId ? Number(editId) : Date.now(),
        name: document.getElementById("customerName").value.trim(),
        phone: document.getElementById("customerPhone").value.trim(),
        email: document.getElementById("customerEmail").value.trim(),
        address: document.getElementById("customerAddress").value.trim()
    };

    if (editId) {
        customers = customers.map(c => c.id === Number(editId) ? customer : c);
    } else {
        customers.push(customer);
    }

    saveData();
    this.reset();
    document.getElementById("customerEditId").value = "";

    renderCustomers();
    updateDashboard();

    alert("Customer saved successfully!");
});

function renderCustomers() {

    const search = document.getElementById("customerSearch").value.toLowerCase();

    const filtered = customers.filter(c =>
        [c.name, c.phone, c.email].some(value =>
            value.toLowerCase().includes(search)
        )
    );

    document.getElementById("customerTable").innerHTML = filtered.map(c => `
        <tr>
            <td>${c.id}</td>
            <td>${escapeHTML(c.name)}</td>
            <td>${escapeHTML(c.phone)}</td>
            <td>${escapeHTML(c.email)}</td>
            <td>${escapeHTML(c.address)}</td>
            <td>
                <button onclick="editCustomer(${c.id})">Edit</button>
                <button class="danger" onclick="deleteCustomer(${c.id})">Delete</button>
            </td>
        </tr>
    `).join("");

}

function editCustomer(id) {

    const c = customers.find(c => c.id === id);
    if (!c) return;

    document.getElementById("customerEditId").value = c.id;
    document.getElementById("customerName").value = c.name;
    document.getElementById("customerPhone").value = c.phone;
    document.getElementById("customerEmail").value = c.email;
    document.getElementById("customerAddress").value = c.address;

}

function deleteCustomer(id) {

    if (!confirm("Delete this customer?")) return;

    if (invoices.some(i => i.customerId === id)) {
        alert("Cannot delete a customer linked to an invoice.");
        return;
    }

    customers = customers.filter(c => c.id !== id);

    saveData();
    refreshAll();
}

// ==================================
// PRODUCT MANAGEMENT
// ==================================

document.getElementById("productForm").addEventListener("submit", function(e) {

    e.preventDefault();

    const editId = document.getElementById("productEditId").value;

    const product = {
        id: editId ? Number(editId) : Date.now(),
        name: document.getElementById("productName").value.trim(),
        price: Number(document.getElementById("productPrice").value),
        tax: Number(document.getElementById("productTax").value),
        description: document.getElementById("productDescription").value.trim()
    };

    if (editId) {
        if (invoices.some(i => i.items.some(item => item.productId === Number(editId)))) {
            alert("This product is used in an invoice. Create a new product instead.");
            return;
        }

        products = products.map(p => p.id === Number(editId) ? product : p);
    } else {
        products.push(product);
    }

    saveData();
    this.reset();
    document.getElementById("productEditId").value = "";

    refreshAll();
    alert("Product saved successfully!");

});

function renderProducts() {

    const search = document.getElementById("productSearch").value.toLowerCase();

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(search)
    );

    document.getElementById("productTable").innerHTML = filtered.map(p => `
        <tr>
            <td>${p.id}</td>
            <td>${escapeHTML(p.name)}</td>
            <td>${money(p.price)}</td>
            <td>${p.tax}%</td>
            <td>${escapeHTML(p.description)}</td>
            <td>
                <button onclick="editProduct(${p.id})">Edit</button>
                <button class="danger" onclick="deleteProduct(${p.id})">Delete</button>
            </td>
        </tr>
    `).join("");

}

function editProduct(id) {

    const p = products.find(p => p.id === id);
    if (!p) return;

    document.getElementById("productEditId").value = p.id;
    document.getElementById("productName").value = p.name;
    document.getElementById("productPrice").value = p.price;
    document.getElementById("productTax").value = p.tax;
    document.getElementById("productDescription").value = p.description;

}

function deleteProduct(id) {

    if (!confirm("Delete this product?")) return;

    if (invoices.some(i => i.items.some(item => item.productId === id))) {
        alert("Cannot delete a product already used in an invoice.");
        return;
    }

    products = products.filter(p => p.id !== id);

    saveData();
    refreshAll();

}

// ==================================
// INVOICE CREATION
// ==================================

function updateCustomerOptions() {

    document.getElementById("invoiceCustomer").innerHTML =
        '<option value="">Select Customer</option>' +
        customers.map(c => `
            <option value="${c.id}">${escapeHTML(c.name)}</option>
        `).join("");

}

function addInvoiceItem() {

    if (products.length === 0) {
        alert("Please add products first!");
        showPage("products");
        return;
    }

    const id = ++itemCounter;

    const container = document.createElement("div");

    container.className = "invoice-item";
    container.id = "item-" + id;

    container.innerHTML = `
        <select class="item-product" onchange="calculateInvoice()">
            <option value="">Select Product</option>
            ${products.map(p => `
                <option value="${p.id}">${escapeHTML(p.name)}</option>
            `).join("")}
        </select>

        <input type="number" class="item-quantity"
               value="1" min="1" step="1"
               oninput="calculateInvoice()">

        <input type="text" class="item-price"
               placeholder="Price" readonly>

        <button type="button" class="danger"
                onclick="removeInvoiceItem(${id})">X</button>
    `;

    document.getElementById("invoiceItems").appendChild(container);

}

function removeInvoiceItem(id) {

    document.getElementById("item-" + id).remove();
    calculateInvoice();

}

function calculateInvoice() {

    let subtotal = 0;
    let taxAmount = 0;

    document.querySelectorAll(".invoice-item").forEach(row => {

        const productId = Number(row.querySelector(".item-product").value);
        const quantity = Number(row.querySelector(".item-quantity").value);

        const product = products.find(p => p.id === productId);

        if (product && quantity > 0 && Number.isInteger(quantity)) {

            const amount = product.price * quantity;
            const tax = amount * product.tax / 100;

            subtotal += amount;
            taxAmount += tax;

            row.querySelector(".item-price").value = money(product.price);

        } else {
            row.querySelector(".item-price").value = "";
        }

    });

    const discountInput = document.getElementById("discount");
    const discount = Math.max(0, Number(discountInput.value) || 0);

    const taxableAmount = Math.max(0, subtotal - discount);

    // Tax is distributed proportionally across products.
    const adjustedTax = subtotal > 0
        ? taxAmount * taxableAmount / subtotal
        : 0;

    const total = taxableAmount + adjustedTax;

    document.getElementById("subtotal").textContent = money(subtotal);
    document.getElementById("taxAmount").textContent = money(adjustedTax);
    document.getElementById("grandTotal").textContent = money(total);

    return { subtotal, discount, tax: adjustedTax, total };

}

document.getElementById("discount").addEventListener("input", calculateInvoice);

document.getElementById("invoiceDate").value = today();
document.getElementById("dueDate").value = today();

document.getElementById("invoiceForm").addEventListener("submit", function(e) {

    e.preventDefault();

    const customerId = Number(document.getElementById("invoiceCustomer").value);
    const customer = customers.find(c => c.id === customerId);

    if (!customer) {
        alert("Please select a customer.");
        return;
    }

    const date = document.getElementById("invoiceDate").value;
    const dueDate = document.getElementById("dueDate").value;

    if (!date || !dueDate || dueDate < date) {
        alert("Please enter a valid invoice date and due date.");
        return;
    }

    const items = [];

    document.querySelectorAll(".invoice-item").forEach(row => {

        const productId = Number(row.querySelector(".item-product").value);
        const quantity = Number(row.querySelector(".item-quantity").value);

        const product = products.find(p => p.id === productId);

        if (product && Number.isInteger(quantity) && quantity > 0) {

            items.push({
                productId: product.id,
                name: product.name,
                price: product.price,
                taxRate: product.tax,
                quantity: quantity
            });

        }

    });

    if (items.length === 0) {
        alert("Please add at least one valid product.");
        return;
    }

    const totals = calculateInvoice();

    const invoice = {
        id: Date.now(),
        customerId: customer.id,
        customerName: customer.name,
        date,
        dueDate,
        items,
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        total: totals.total,
        paid: 0
    };

    invoices.push(invoice);

    saveData();

    this.reset();

    document.getElementById("invoiceItems").innerHTML = "";
    document.getElementById("invoiceDate").value = today();
    document.getElementById("dueDate").value = today();
    document.getElementById("discount").value = 0;

    calculateInvoice();
    refreshAll();

    alert("Invoice generated successfully!");

});

// ==================================
// INVOICE MANAGEMENT
// ==================================

function getInvoiceStatus(invoice) {

    if (invoice.paid >= invoice.total - 0.005) {
        return "Paid";
    }

    if (invoice.paid > 0) {
        return "Partially Paid";
    }

    if (invoice.dueDate < today()) {
        return "Overdue";
    }

    return "Pending";

}

function renderInvoices() {

    const search = document.getElementById("invoiceSearch").value.toLowerCase();

    const filtered = invoices.filter(i =>
        String(i.id).includes(search) ||
        i.customerName.toLowerCase().includes(search)
    );

    document.getElementById("invoiceTable").innerHTML = filtered.map(i => {

        const status = getInvoiceStatus(i);

        return `
            <tr>
                <td>${i.id}</td>
                <td>${escapeHTML(i.customerName)}</td>
                <td>${i.date}</td>
                <td>${i.dueDate}</td>
                <td>${money(i.total)}</td>
                <td class="status-${status.toLowerCase().split(" ")[0]}">${status}</td>
                <td>
                    <button onclick="viewInvoice(${i.id})">View</button>
                    <button onclick="printInvoice(${i.id})">PDF / Print</button>
                </td>
            </tr>
        `;

    }).join("");

}

function viewInvoice(id) {

    const i = invoices.find(i => i.id === id);
    if (!i) return;

    alert(
        "Invoice ID: " + i.id +
        "\nCustomer: " + i.customerName +
        "\nDate: " + i.date +
        "\nDue Date: " + i.dueDate +
        "\nSubtotal: " + money(i.subtotal) +
        "\nDiscount: " + money(i.discount) +
        "\nTax: " + money(i.tax) +
        "\nTotal: " + money(i.total) +
        "\nPaid: " + money(i.paid) +
        "\nBalance: " + money(i.total - i.paid) +
        "\nStatus: " + getInvoiceStatus(i)
    );

}

// ==================================
// PRINT INVOICE
// ==================================

function printInvoice(id) {

    const i = invoices.find(i => i.id === id);
    if (!i) return;

    const customer = customers.find(c => c.id === i.customerId);

    const rows = i.items.map(item => `
        <tr>
            <td>${escapeHTML(item.name)}</td>
            <td>${item.quantity}</td>
            <td>${money(item.price)}</td>
            <td>${item.taxRate}%</td>
            <td>${money(item.price * item.quantity)}</td>
        </tr>
    `).join("");

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
        alert("Please allow pop-ups to print the invoice.");
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice ${i.id}</title>
            <style>
                body { font-family: Arial; padding: 35px; }
                h1 { color: #172554; }
                table { width: 100%; border-collapse: collapse; margin-top: 25px; }
                th, td { border: 1px solid #ccc; padding: 12px; text-align: left; }
                th { background: #eaf0ff; }
                .total { text-align: right; margin-top: 25px; }
            </style>
        </head>
        <body>
            <h1>InvoicePro</h1>
            <h2>INVOICE</h2>
            <p>Invoice Number: ${i.id}</p>
            <p>Invoice Date: ${i.date}</p>
            <p>Due Date: ${i.dueDate}</p>

            <h3>Customer Details</h3>
            <p>${escapeHTML(i.customerName)}</p>
            <p>${escapeHTML(customer?.email || "")}</p>
            <p>${escapeHTML(customer?.address || "")}</p>

            <table>
                <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Tax</th>
                    <th>Amount</th>
                </tr>
                ${rows}
            </table>

            <div class="total">
                <p>Subtotal: ${money(i.subtotal)}</p>
                <p>Discount: ${money(i.discount)}</p>
                <p>Tax: ${money(i.tax)}</p>
                <h2>Total: ${money(i.total)}</h2>
                <p>Paid: ${money(i.paid)}</p>
                <h3>Balance: ${money(i.total - i.paid)}</h3>
                <p>Status: ${getInvoiceStatus(i)}</p>
            </div>

            <p>Thank you for your business!</p>

            <script>
                window.onload = function() {
                    window.print();
                };
            <\/script>
        </body>
        </html>
    `);

    printWindow.document.close();

}

// ==================================
// PAYMENT MANAGEMENT
// ==================================

function updatePaymentOptions() {

    const select = document.getElementById("paymentInvoice");

    select.innerHTML = '<option value="">Select Invoice</option>' +
        invoices.filter(i => i.paid < i.total - 0.005).map(i => `
            <option value="${i.id}">
                Invoice ${i.id} - ${escapeHTML(i.customerName)}
                (Balance: ${money(i.total - i.paid)})
            </option>
        `).join("");

}

document.getElementById("paymentDate").value = today();

document.getElementById("paymentForm").addEventListener("submit", function(e) {

    e.preventDefault();

    const invoiceId = Number(document.getElementById("paymentInvoice").value);
    const amount = Number(document.getElementById("paymentAmount").value);
    const date = document.getElementById("paymentDate").value;

    const invoice = invoices.find(i => i.id === invoiceId);

    if (!invoice || !date || date > today() || !Number.isFinite(amount) || amount <= 0) {
        alert("Enter valid payment details.");
        return;
    }

    const balance = invoice.total - invoice.paid;

    if (amount > balance + 0.005) {
        alert("Payment cannot exceed the remaining balance.");
        return;
    }

    invoice.paid = Math.min(invoice.total, invoice.paid + amount);

    payments.push({
        id: Date.now(),
        invoiceId,
        amount,
        date
    });

    saveData();

    this.reset();
    document.getElementById("paymentDate").value = today();

    refreshAll();

    alert("Payment recorded successfully!");

});

function renderPayments() {

    document.getElementById("paymentTable").innerHTML =
        payments.map(p => `
            <tr>
                <td>${p.id}</td>
                <td>${p.invoiceId}</td>
                <td>${money(p.amount)}</td>
                <td>${p.date}</td>
            </tr>
        `).join("");

}

// ==================================
// DASHBOARD
// ==================================

function updateDashboard() {

    document.getElementById("totalCustomers").textContent = customers.length;
    document.getElementById("totalProducts").textContent = products.length;
    document.getElementById("totalInvoices").textContent = invoices.length;

    const revenue = invoices.reduce((sum, i) => sum + i.total, 0);

    document.getElementById("totalRevenue").textContent = money(revenue);

    document.getElementById("paidInvoices").textContent =
        invoices.filter(i => getInvoiceStatus(i) === "Paid").length;

    document.getElementById("pendingInvoices").textContent =
        invoices.filter(i => getInvoiceStatus(i) !== "Paid").length;

    document.getElementById("recentInvoices").innerHTML =
        [...invoices].reverse().slice(0, 5).map(i => `
            <tr>
                <td>${i.id}</td>
                <td>${escapeHTML(i.customerName)}</td>
                <td>${i.date}</td>
                <td>${money(i.total)}</td>
                <td>${getInvoiceStatus(i)}</td>
            </tr>
        `).join("");

}

// ==================================
// REPORTS
// ==================================

function updateReports() {

    const sales = invoices.reduce((sum, i) => sum + i.total, 0);

    const received = payments.reduce((sum, p) => sum + p.amount, 0);

    const pending = invoices.reduce((sum, i) => sum + i.total - i.paid, 0);

    document.getElementById("reportSales").textContent = money(sales);

    document.getElementById("reportPayments").textContent = money(received);

    document.getElementById("reportPending").textContent = money(pending);

}

// ==================================
// REFRESH ALL MODULES
// ==================================

function refreshAll() {

    renderCustomers();
    renderProducts();
    renderInvoices();
    renderPayments();

    updateCustomerOptions();
    updatePaymentOptions();

    updateDashboard();
    updateReports();

}

// ==================================
// INITIALIZE WEBSITE
// ==================================

refreshAll();
