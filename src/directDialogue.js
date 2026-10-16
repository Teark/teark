import { rankDialoguePeople } from './influence.js';

export function setupDirectDialogue(getPeople, onSelect) {
  const root = document.querySelector('#direct-dialogue');
  const input = root.querySelector('input');
  const list = root.querySelector('[role="listbox"]');
  const status = root.querySelector('[role="status"]');
  let matches = [], active = -1;
  function close() {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  }
  function highlight(index) {
    active = index;
    [...list.children].forEach((option, i) => option.setAttribute('aria-selected', String(i === active)));
    if (active >= 0) {
      input.setAttribute('aria-activedescendant', list.children[active].id);
      list.children[active].scrollIntoView({ block: 'nearest' });
    } else input.removeAttribute('aria-activedescendant');
  }
  function show() {
    const query = input.value.trim().toLocaleLowerCase();
    matches = rankDialoguePeople(getPeople()).filter(person => person.name.toLocaleLowerCase().includes(query));
    list.replaceChildren(...matches.map((person, index) => {
      const option = document.createElement('div');
      option.id = `dialogue-option-${index}`;
      option.dataset.index = index;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      const name = document.createElement('span');
      name.textContent = person.name;
      option.append(name);
      return option;
    }));
    status.textContent = matches.length ? '' : '没有匹配人物，无法选择';
    list.hidden = !matches.length;
    input.setAttribute('aria-expanded', String(matches.length > 0));
    highlight(-1);
  }
  function choose(index) {
    const person = matches[index];
    if (!person || !getPeople().some(item => item.id === person.id)) return;
    onSelect(person.id);
    input.value = person.name;
    status.textContent = '';
    close();
  }
  input.addEventListener('focus', show);
  input.addEventListener('input', show);
  input.addEventListener('keydown', event => {
    if (event.isComposing) return;
    if (event.key === 'Escape') { close(); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (list.hidden) show();
      if (matches.length) highlight(event.key === 'ArrowDown' ? (active + 1) % matches.length : (active < 0 ? matches.length - 1 : (active - 1 + matches.length) % matches.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (!list.hidden && active >= 0) choose(active);
    }
  });
  list.addEventListener('mousedown', event => event.preventDefault());
  list.addEventListener('click', event => {
    const option = event.target.closest('[role="option"]');
    if (option) choose(Number(option.dataset.index));
  });
  root.addEventListener('focusout', event => { if (!root.contains(event.relatedTarget)) close(); });
  document.addEventListener('pointerdown', event => { if (!root.contains(event.target)) close(); });
}
