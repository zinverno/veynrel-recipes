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
    document.querySelector('#results').textContent = `${count} ${document.documentElement.lang === "ru" ? "сценариев" : "recipes"}`;
  };
  query.addEventListener('input', filter); category.addEventListener('change', filter); filter();
}

const language = document.querySelector('#language');
if (language) {
  language.parentElement.hidden = false;
  const setLanguage = () => {
    document.documentElement.lang = language.value;
    for (const node of document.querySelectorAll('[data-lang]')) node.hidden = node.dataset.lang !== language.value;
    const categories = { learning: ["Learning", "Учёба"], work: ["Work", "Работа"], writing: ["Writing", "Тексты"], knowledge: ["Knowledge", "Знания"], daily: ["Daily notes", "Ежедневные заметки"] };
    for (const option of document.querySelectorAll('#category option')) if (categories[option.value]) option.textContent = categories[option.value][language.value === 'ru' ? 1 : 0];
    query?.dispatchEvent(new Event('input'));
    for (const option of document.querySelectorAll('option[data-en]')) option.textContent = option.dataset[language.value];
  };
  language.value = new URLSearchParams(location.search).get('lang') === 'ru' ? 'ru' : 'en';
  setLanguage();
  language.addEventListener('change', () => {
    setLanguage();
    const url = new URL(location.href); url.searchParams.set('lang', language.value); history.replaceState(null, '', url);
  });
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (link && !link.hasAttribute('download')) { const url = new URL(link.href); if (url.origin === location.origin && !url.pathname.endsWith('.json')) { url.searchParams.set('lang', language.value); link.href = url.href; } }
  });
}
