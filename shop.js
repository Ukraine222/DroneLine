function renderShop(state, updateUI, updateInventory, showNotification, saveGame) {
    const shopContent = document.getElementById('shopContent');
    shopContent.innerHTML = '';
    const shopTabs = document.getElementById('shopTabs');
    shopTabs.innerHTML = '';

    const tabs = [
        { id: 'machineGuns', name: 'Пулеметы' },
        { id: 'zu', name: 'ЗУ' },
        { id: 'pzrk', name: 'ПЗРК' },
        { id: 'zrk', name: 'ЗРК' },
        { id: 'lo', name: 'ЛО' },
        { id: 'mo', name: 'МО' }
    ];

    const machineGuns = [
        {
            id: 'PKM',
            name: 'ПКМ',
            price: 50,
            image: 'PKM.jpg',
            description: 'Пулемет ПКМ, 10 попаданий для уничтожения дрона'
        },
        {
            id: 'RPK',
            name: 'РПК',
            price: 200,
            image: 'RPK.jpg',
            description: 'Пулемет РПК, 9 попаданий для уничтожения дрона'
        },
        {
            id: 'M249',
            name: 'M249 SAW',
            price: 500,
            image: 'M249.jpg',
            description: 'Пулемет M249 SAW, 8 попаданий для уничтожения дрона'
        }
    ];

    tabs.forEach((tab, index) => {
        const tabDiv = document.createElement('div');
        tabDiv.className = `shop-tab ${index === 0 ? 'active' : ''}`;
        tabDiv.textContent = tab.name;
        tabDiv.addEventListener('click', () => {
            document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.shop-content').forEach(c => c.classList.remove('active'));
            tabDiv.classList.add('active');
            document.getElementById(tab.id).classList.add('active');
        });
        shopTabs.appendChild(tabDiv);

        const contentDiv = document.createElement('div');
        contentDiv.className = `shop-content ${index === 0 ? 'active' : ''}`;
        contentDiv.id = tab.id;
        shopContent.appendChild(contentDiv);

        if (tab.id === 'machineGuns') {
            machineGuns.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'shop-item';
                const isPurchased = state.inventory.some(i => i.id === item.id);
                itemDiv.innerHTML = `
                    <img src="${item.image}" alt="${item.name}">
                    <div>
                        <div>${item.name}</div>
                        <div>${item.description}</div>
                    </div>
                    <span class="shop-item-price">${item.price} монет</span>
                    <button ${isPurchased ? 'disabled' : state.coins < item.price ? 'disabled' : ''}>${isPurchased ? 'Куплено!' : 'Купить'}</button>
                `;
                if (!isPurchased) {
                    itemDiv.querySelector('button').addEventListener('click', () => buyWeapon(item, state, updateUI, updateInventory, showNotification, saveGame, itemDiv));
                }
                contentDiv.appendChild(itemDiv);
            });
        }
    });
}

function buyWeapon(item, state, updateUI, updateInventory, showNotification, saveGame, itemDiv) {
    if (state.coins >= item.price && !state.inventory.some(i => i.id === item.id)) {
        state.coins -= item.price;
        state.inventory.push({ id: item.id, name: item.name });
        updateUI();
        updateInventory();
        showNotification(`Вы купили ${item.name}!`);
        saveGame();
        itemDiv.querySelector('button').textContent = 'Куплено!';
        itemDiv.querySelector('button').disabled = true;
    } else if (state.coins < item.price) {
        showNotification('Недостаточно монет!');
    } else {
        showNotification(`${item.name} уже куплен!`);
    }
}

window.renderShop = renderShop;