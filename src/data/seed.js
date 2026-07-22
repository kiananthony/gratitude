// Demo seed data so the web app is fully explorable without a backend.
const day = 86400000;
const now = Date.now();

export const SEED_USER = {
  id: 'me',
  screenName: 'you',
  email: 'you@gratitude.app',
  motto: 'Notice one small good thing every day.',
  userType: 'Gratitude+ Member',
  photoURL: null,
};

// A handful of "connections" whose public posts appear in the shared timeline.
export const SEED_PEOPLE = {
  maya:   { id: 'maya',   screenName: 'maya',   motto: 'Slow mornings, strong coffee.', photoURL: null },
  leo:    { id: 'leo',    screenName: 'leo',    motto: 'Grateful is a practice, not a mood.', photoURL: null },
  amara:  { id: 'amara',  screenName: 'amara',  motto: 'Find the light, then share it.', photoURL: null },
};

export const SEED_POSTS = [
  { id: 'p1', ownerId: 'me',    gratitude: 'A long walk at golden hour — the whole street smelled like cut grass.', date: now - 0.4 * day, isPublic: true,  photoURL: null, heartedBy: ['maya'] },
  { id: 'p2', ownerId: 'me',    gratitude: 'My sister called just to talk. No reason, no agenda.',                   date: now - 1.2 * day, isPublic: false, photoURL: null, heartedBy: [] },
  { id: 'p3', ownerId: 'maya',  gratitude: 'The barista remembered my order and drew a little sun on the cup ☀️',   date: now - 1.6 * day, isPublic: true,  photoURL: null, heartedBy: ['me'] },
  { id: 'p4', ownerId: 'leo',   gratitude: 'Finished the project I kept avoiding. Relief is its own kind of joy.',   date: now - 2.3 * day, isPublic: true,  photoURL: null, heartedBy: [] },
  { id: 'p5', ownerId: 'me',    gratitude: 'Rain on the window while I read. Nowhere to be.',                        date: now - 3.1 * day, isPublic: true,  photoURL: null, heartedBy: ['leo','amara'] },
  { id: 'p6', ownerId: 'amara', gratitude: 'A stranger held the door and wished me a good day. Small, but it stayed with me.', date: now - 4.0 * day, isPublic: true, photoURL: null, heartedBy: ['me'] },
  { id: 'p7', ownerId: 'me',    gratitude: 'Leftover soup tasted even better today.',                              date: now - 6.5 * day, isPublic: false, photoURL: null, heartedBy: [] },
  { id: 'p8', ownerId: 'me',    gratitude: 'Caught the sunrise by accident and stayed for all of it.',              date: now - 9 * day,   isPublic: true,  photoURL: null, heartedBy: ['maya','leo'] },
  { id: 'p9', ownerId: 'maya',  gratitude: 'Old playlist, new apartment. It finally feels like home.',              date: now - 11 * day,  isPublic: true,  photoURL: null, heartedBy: [] },
  { id: 'p10', ownerId: 'me',   gratitude: 'My plant that I was sure had died put out a new leaf.',                 date: now - 13 * day,  isPublic: true,  photoURL: null, heartedBy: ['amara'] },
];

export const SEED_FRIENDS = [
  { ...SEED_PEOPLE.maya,  state: 'friend' },
  { ...SEED_PEOPLE.leo,   state: 'friend' },
  { ...SEED_PEOPLE.amara, state: 'friend' },
];

export const SEED_REQUESTS = [
  { id: 'noah', screenName: 'noah', motto: 'Coffee, code, and clear skies.', state: 'received' },
];

export const SEED_ACTIVITY = [
  { id: 'a1', fromScreenName: 'maya',  text: 'shared a sentiment on your post.', read: false, date: now - 0.2 * day },
  { id: 'a2', fromScreenName: 'leo',   text: 'shared a sentiment on your post.', read: false, date: now - 3 * day },
];

export const ALL_PEOPLE = { me: SEED_USER, ...SEED_PEOPLE, noah: { id: 'noah', screenName: 'noah', motto: 'Coffee, code, and clear skies.' } };
