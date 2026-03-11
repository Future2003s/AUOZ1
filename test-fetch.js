fetch('http://localhost:8081/api/v1/orders/track/ORD-JWJK4V-HUIJ')
    .then(res => res.json())
    .then(data => {
        console.log("Image URL:", data.data.items[0].image);
    })
    .catch(err => console.error(err));
