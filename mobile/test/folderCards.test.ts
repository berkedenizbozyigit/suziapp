import { describe, expect, it } from 'vitest';

import { buildFolderCards, type FolderRow, type SaveRow } from '../lib/folderCards';

const folder = (id: string, name: string, query_text: string | null = null): FolderRow => ({
  id,
  name,
  query_text,
  created_at: '2026-07-01T00:00:00Z',
});

const save = (folder_id: string | null, image_url: string | null = null): SaveRow => ({
  folder_id,
  products: image_url === null ? null : { image_url },
});

describe('buildFolderCards', () => {
  it('counts saves per folder and uses the first available image as cover', () => {
    const cards = buildFolderCards(
      [folder('f1', 'Euro Summer', 'linen dress')],
      [save('f1', 'a.jpg'), save('f1', 'b.jpg')],
    );
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      id: 'f1',
      name: 'Euro Summer',
      queryText: 'linen dress',
      count: 2,
      coverImage: 'a.jpg', // first save wins (callers pass newest-first)
    });
  });

  it('skips leading null images and picks the first real image as cover', () => {
    const cards = buildFolderCards(
      [folder('f1', 'Corporate')],
      [save('f1', null), save('f1', 'real.jpg')],
    );
    expect(cards[0].count).toBe(2);
    expect(cards[0].coverImage).toBe('real.jpg');
  });

  it('gives a folder with no saves a count of 0 and a null cover', () => {
    const cards = buildFolderCards([folder('empty', 'Fresh')], []);
    expect(cards[0]).toMatchObject({ id: 'empty', count: 0, coverImage: null });
  });

  it('prepends an "All saves" card only when unfiled saves exist', () => {
    const cards = buildFolderCards(
      [folder('f1', 'Named')],
      [save(null, 'unfiled.jpg'), save('f1', 'x.jpg')],
    );
    expect(cards[0]).toMatchObject({ id: null, name: 'All saves', count: 1, coverImage: 'unfiled.jpg' });
    expect(cards[1]).toMatchObject({ id: 'f1', count: 1 });
  });

  it('does NOT add "All saves" when every save is filed', () => {
    const cards = buildFolderCards([folder('f1', 'Named')], [save('f1', 'x.jpg')]);
    expect(cards.every((c) => c.id !== null)).toBe(true);
    expect(cards).toHaveLength(1);
  });

  it('preserves the order folders were passed in (after any All saves card)', () => {
    const cards = buildFolderCards(
      [folder('a', 'Alpha'), folder('b', 'Beta')],
      [save('b', 'b.jpg')],
    );
    expect(cards.map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('returns an empty array when there are no folders and no unfiled saves', () => {
    expect(buildFolderCards([], [])).toEqual([]);
  });
});
