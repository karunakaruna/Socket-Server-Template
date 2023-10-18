export function showMenu(type, x, y) {
    // First, hide all menus
    document.querySelectorAll('.contextMenu').forEach(menu => {
        menu.style.display = 'none';
    });

    // Then, display the desired menu
    const menu = document.getElementById(type + 'Menu');
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.display = 'block';
}