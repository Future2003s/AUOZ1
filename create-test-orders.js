const fetch = require("node-fetch");

const BASE_URL = "http://localhost:8081/api/v1";

// Sample order data
const sampleOrders = [
    {
        amount: 380000,
        description: "1 sản phẩm - Người mua: Nguyễn Văn A - ĐT: 0123456789",
        items: [
            {
                name: "Mật Ong Hoa Vải 435g",
                quantity: 1,
                price: 380000
            }
        ],
        customer: {
            fullName: "Nguyễn Văn A",
            phone: "0123456789",
            email: "nguyenvana@example.com",
            address: "123 Đường ABC, Quận 1, TP.HCM",
            note: "Giao giờ hành chính"
        },
        paymentMethod: "cod"
    },
    {
        amount: 750000,
        description: "2 sản phẩm - Người mua: Trần Thị B - ĐT: 0987654321",
        items: [
            {
                name: "Mật Ong Hoa Cà Phê 500g",
                quantity: 2,
                price: 375000
            }
        ],
        customer: {
            fullName: "Trần Thị B",
            phone: "0987654321",
            email: "tranthib@example.com",
            address: "456 Đường XYZ, Quận 2, TP.HCM",
            note: "Giao buổi tối"
        },
        paymentMethod: "cod"
    },
    {
        amount: 1200000,
        description: "3 sản phẩm - Người mua: Lê Văn C - ĐT: 0369258147",
        items: [
            {
                name: "Combo Mật Ong Đặc Biệt",
                quantity: 1,
                price: 1200000
            }
        ],
        customer: {
            fullName: "Lê Văn C",
            phone: "0369258147",
            email: "levanc@example.com",
            address: "789 Đường DEF, Quận 3, TP.HCM",
            note: "Gói quà"
        },
        paymentMethod: "cod"
    }
];

async function createTestOrders() {
    console.log("📦 Creating Test Orders for Admin Dashboard\n");

    for (let i = 0; i < sampleOrders.length; i++) {
        const order = sampleOrders[i];
        console.log(`🛍️ Creating order ${i + 1}/3...`);

        try {
            const response = await fetch(`${BASE_URL}/orders/guest`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(order)
            });

            if (response.ok) {
                const result = await response.json();
                console.log(`✅ Order created: ${result.data?.orderNumber || "N/A"}`);
            } else {
                const errorText = await response.text();
                console.log(`❌ Failed to create order: ${response.status}`);
                console.log("Error:", errorText);
            }
        } catch (error) {
            console.error(`💥 Error creating order ${i + 1}:`, error.message);
        }
    }

    console.log("\n🎉 Test orders creation completed!");
    console.log("📋 You can now check the admin dashboard for orders");
}

if (require.main === module) {
    createTestOrders().catch(console.error);
}

module.exports = { createTestOrders };
