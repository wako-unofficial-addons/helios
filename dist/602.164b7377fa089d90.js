'use strict';
((typeof self < 'u' ? self : this).webpackChunkplugin =
  (typeof self < 'u' ? self : this).webpackChunkplugin || []).push([
  [602],
  {
    602: (dt, y, O) => {
      O.r(y), O.d(y, { scopeCss: () => ut });
      const _ = '-shadowcsshost',
        b = '-shadowcssslotted',
        E = '-shadowcsscontext',
        C = ')(?:\\(((?:\\([^)(]*\\)|[^)(]*)+?)\\))?([^,{]*)',
        v = new RegExp('(' + _ + C, 'gim'),
        N = new RegExp('(' + E + C, 'gim'),
        M = new RegExp('(' + b + C, 'gim'),
        f = _ + '-no-combinator',
        x = /-shadowcsshost-no-combinator([^\s]*)/,
        D = [/::shadow/g, /::content/g],
        m = /-shadowcsshost/gim,
        $ = (t) => new RegExp(`((?<!(^@supports(.*)))|(?<={.*))(${t}\\b)`, 'gim'),
        K = $('::slotted'),
        U = $(':host'),
        Y = $(':host-context'),
        A = /\/\*\s*[\s\S]*?\*\//g,
        z = /\/\*\s*#\s*source(Mapping)?URL=[\s\S]+?\*\//g,
        J = /(\s*)([^;\{\}]+?)(\s*)((?:{%BLOCK%}?\s*;?)|(?:\s*;))/g,
        Q = /([{}])/g,
        V = /(^.*?[^\\])??((:+)(.*)|$)/,
        R = '%BLOCK%',
        H = (t, e) => {
          const o = q(t);
          let s = 0;
          return o.escapedString.replace(J, (...c) => {
            const n = c[2];
            let p = '',
              r = c[4],
              l = '';
            r && r.startsWith('{' + R) && ((p = o.blocks[s++]), (r = r.substring(8)), (l = '{'));
            const a = e({ selector: n, content: p });
            return `${c[1]}${a.selector}${c[3]}${l}${a.content}${r}`;
          });
        },
        q = (t) => {
          const e = t.split(Q),
            o = [],
            s = [];
          let c = 0,
            n = [];
          for (let r = 0; r < e.length; r++) {
            const l = e[r];
            '}' === l && c--,
              c > 0 ? n.push(l) : (n.length > 0 && (s.push(n.join('')), o.push(R), (n = [])), o.push(l)),
              '{' === l && c++;
          }
          return n.length > 0 && (s.push(n.join('')), o.push(R)), { escapedString: o.join(''), blocks: s };
        },
        w = (t, e, o) =>
          t.replace(e, (...s) => {
            if (s[2]) {
              const c = s[2].split(','),
                n = [];
              for (let p = 0; p < c.length; p++) {
                const r = c[p].trim();
                if (!r) break;
                n.push(o(f, r, s[3]));
              }
              return n.join(',');
            }
            return f + s[3];
          }),
        B = (t, e, o) => t + e.replace(_, '') + o,
        et = (t, e, o) => (e.indexOf(_) > -1 ? B(t, e, o) : t + e + o + ', ' + e + ' ' + t + o),
        W = (t, e) => t.replace(V, (o, s = '', c, n = '', p = '') => s + e + n + p),
        L = (t, e, o, s, c) =>
          H(t, (n) => {
            let p = n.selector,
              r = n.content;
            return (
              '@' !== n.selector[0]
                ? (p = ((t, e, o, s) =>
                    t
                      .split(',')
                      .map((c) =>
                        s && c.indexOf('.' + s) > -1
                          ? c.trim()
                          : ((t, e) =>
                                !((t) => (
                                  (t = t.replace(/\[/g, '\\[').replace(/\]/g, '\\]')),
                                  new RegExp('^(' + t + ')([>\\s~+[.,{:][\\s\\S]*)?$', 'm')
                                ))(e).test(t))(c, e)
                            ? ((t, e, o) => {
                                const c = '.' + (e = e.replace(/\[is=([^\]]*)\]/g, (g, ...d) => d[0])),
                                  n = (g) => {
                                    let d = g.trim();
                                    if (!d) return '';
                                    if (g.indexOf(f) > -1)
                                      d = ((t, e, o) => {
                                        if (((m.lastIndex = 0), m.test(t))) {
                                          const s = `.${o}`;
                                          return t.replace(x, (c, n) => W(n, s)).replace(m, s + ' ');
                                        }
                                        return e + ' ' + t;
                                      })(g, e, o);
                                    else {
                                      const S = g.replace(m, '');
                                      S.length > 0 && (d = W(S, c));
                                    }
                                    return d;
                                  },
                                  p = ((t) => {
                                    const e = [];
                                    let o = 0;
                                    return {
                                      content: (t = t.replace(/(\[[^\]]*\])/g, (n, p) => {
                                        const r = `__ph-${o}__`;
                                        return e.push(p), o++, r;
                                      })).replace(/(:nth-[-\w]+)(\([^)]+\))/g, (n, p, r) => {
                                        const l = `__ph-${o}__`;
                                        return e.push(r), o++, p + l;
                                      }),
                                      placeholders: e,
                                    };
                                  })(t);
                                let i,
                                  r = '',
                                  l = 0;
                                const a = /( |>|\+|~(?!=))\s*/g;
                                let u = !((t = p.content).indexOf(f) > -1);
                                for (; null !== (i = a.exec(t)); ) {
                                  const g = i[1],
                                    d = t.slice(l, i.index).trim();
                                  (u = u || d.indexOf(f) > -1), (r += `${u ? n(d) : d} ${g} `), (l = a.lastIndex);
                                }
                                const k = t.substring(l);
                                return (
                                  (u = u || k.indexOf(f) > -1),
                                  (r += u ? n(k) : k),
                                  ((t, e) => e.replace(/__ph-(\d+)__/g, (o, s) => t[+s]))(p.placeholders, r)
                                );
                              })(c, e, o).trim()
                            : c.trim(),
                      )
                      .join(', '))(n.selector, e, o, s))
                : (n.selector.startsWith('@media') ||
                    n.selector.startsWith('@supports') ||
                    n.selector.startsWith('@page') ||
                    n.selector.startsWith('@document')) &&
                  (r = L(n.content, e, o, s)),
              { selector: p.replace(/\s{2,}/g, ' ').trim(), content: r }
            );
          }),
        ut = (t, e, o) => {
          const s = e + '-h',
            c = e + '-s',
            n = ((t) => t.match(z) || [])(t);
          t = ((t) => t.replace(A, ''))(t);
          const p = [];
          if (o) {
            const l = (i) => {
              const a = `/*!@___${p.length}___*/`;
              return p.push({ placeholder: a, comment: `/*!@${i.selector}*/` }), (i.selector = a + i.selector), i;
            };
            t = H(t, (i) =>
              '@' !== i.selector[0]
                ? l(i)
                : ((i.selector.startsWith('@media') ||
                    i.selector.startsWith('@supports') ||
                    i.selector.startsWith('@page') ||
                    i.selector.startsWith('@document')) &&
                    (i.content = H(i.content, l)),
                  i),
            );
          }
          const r = ((t, e, o, s, c) => {
            const n = ((t, e) => {
              const o = '.' + e + ' > ',
                s = [];
              return (
                (t = t.replace(M, (...c) => {
                  if (c[2]) {
                    const n = c[2].trim(),
                      r = o + n + c[3];
                    let l = '';
                    for (let h = c[4] - 1; h >= 0; h--) {
                      const u = c[5][h];
                      if ('}' === u || ',' === u) break;
                      l = u + l;
                    }
                    const i = l + r,
                      a = `${l.trimRight()}${r.trim()}`;
                    return i.trim() !== a.trim() && s.push({ orgSelector: i, updatedSelector: `${a}, ${i}` }), r;
                  }
                  return f + c[3];
                })),
                { selectors: s, cssText: t }
              );
            })(
              (t = ((t) => w(t, N, et))(
                (t = ((t) => w(t, v, B))(
                  (t = ((t) => t.replace(Y, `$1${E}`).replace(U, `$1${_}`).replace(K, `$1${b}`))(t)),
                )),
              )),
              s,
            );
            return (
              (t = ((t) => D.reduce((e, o) => e.replace(o, ' '), t))((t = n.cssText))),
              e && (t = L(t, e, o, s)),
              {
                cssText: (t = (t = t.replace(/-shadowcsshost-no-combinator/g, `.${o}`)).replace(
                  />\s*\*\s+([^{, ]+)/gm,
                  ' $1 ',
                )).trim(),
                slottedSelectors: n.selectors,
              }
            );
          })(t, e, s, c);
          return (
            (t = [r.cssText, ...n].join('\n')),
            o &&
              p.forEach(({ placeholder: l, comment: i }) => {
                t = t.replace(l, i);
              }),
            r.slottedSelectors.forEach((l) => {
              t = t.replace(l.orgSelector, l.updatedSelector);
            }),
            t
          );
        };
    },
  },
]);
