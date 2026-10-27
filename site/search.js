const query = document.querySelector('#search');
const category = document.querySelector('#category');
if (query && category) {
  const cards = [...document.querySelectorAll('[data-recipe]')];
  const filter = () => {
    let count = 0;
    for (const card of cards) {
      card.hidden = !(card.dataset.search.toLocaleLowerCase().includes(query.value.toLocaleLowerCase()) && (category.value === 'all' || card.dataset.category === category.value));
      if (!card.hidden) count++;
    }
    document.querySelector('#results').textContent = `${count} recipes / сценариев`;
  };
  query.addEventListener('input', filter); category.addEventListener('change', filter); filter();
}
