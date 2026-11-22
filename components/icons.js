// Shared Academy SVG navigation icons. Framework-independent.
const outline = (body) => `<svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
export const icons={
 dashboard:outline('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
 manual:outline('<path d="M5 4h13a2 2 0 0 1 2 2v14H7a2 2 0 0 0-2 2V4z"/><path d="M5 4a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h15M9 9h7M9 13h6"/>'),
 lessons:outline('<path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H11v17H5.5A2.5 2.5 0 0 0 3 22z"/><path d="M21 5.5A2.5 2.5 0 0 0 18.5 3H13v17h5.5A2.5 2.5 0 0 1 21 22z"/>'),
 lab:outline('<path d="M8 3h8M10 3v5l-6 10a2 2 0 0 0 1.7 3h12.6A2 2 0 0 0 20 18L14 8V3M8 13h8M7 17h10"/>'),
 classroom:outline('<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4M9 8l6 3-6 3z"/>'),
 practice:outline('<path d="M9 3H4v5a2 2 0 1 1 0 4v5h5a2 2 0 1 0 4 0h5v-5a2 2 0 1 0 0-4V3h-5a2 2 0 1 0-4 0z"/>'),
 requests:outline('<path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-4 3v-6a7.5 7.5 0 1 1 17-4.5z"/><path d="M8 10h8M8 13.5h5"/>'),
 revisions:outline('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/>'),
 reports:outline('<path d="M4 20V4M4 20h17M8 16v-4M13 16V7M18 16v-8"/>'),
 settings:outline('<path d="M10 2h4l.6 2.2 2 .9 2.1-1.2 2.8 2.8-1.2 2.1.9 2L23 11v4l-2.2.6-.9 2 1.2 2.1-2.8 2.8-2.1-1.2-2 .9L14 23h-4l-.6-2.2-2-.9-2.1 1.2-2.8-2.8 1.2-2.1-.9-2L1 15v-4l2.2-.6.9-2-1.2-2.1 2.8-2.8 2.1 1.2 2-.9z" transform="translate(0 -1) scale(.96)"/><circle cx="12" cy="12" r="3"/>')
};
