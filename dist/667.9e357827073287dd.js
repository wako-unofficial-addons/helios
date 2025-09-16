'use strict';
((typeof self < 'u' ? self : this).webpackChunkplugin =
  (typeof self < 'u' ? self : this).webpackChunkplugin || []).push([
  [667],
  {
    667: (v, s, t) => {
      (t.r(s), t.d(s, { mdTransitionAnimation: () => g }));
      var o = t(587),
        d = t(727);
      const g = (h, i) => {
        var a, l, r;
        const c = '40px',
          u = 'back' === i.direction,
          m = i.leavingEl,
          E = (0, d.g)(i.enteringEl),
          f = E.querySelector('ion-toolbar'),
          n = (0, o.c)();
        if (
          (n.addElement(E).fill('both').beforeRemoveClass('ion-page-invisible'),
          u
            ? n
                .duration((null !== (a = i.duration) && void 0 !== a ? a : 0) || 200)
                .easing('cubic-bezier(0.47,0,0.745,0.715)')
            : n
                .duration((null !== (l = i.duration) && void 0 !== l ? l : 0) || 280)
                .easing('cubic-bezier(0.36,0.66,0.04,1)')
                .fromTo('transform', `translateY(${c})`, 'translateY(0px)')
                .fromTo('opacity', 0.01, 1),
          f)
        ) {
          const e = (0, o.c)();
          (e.addElement(f), n.addAnimation(e));
        }
        if (m && u) {
          n.duration((null !== (r = i.duration) && void 0 !== r ? r : 0) || 200).easing(
            'cubic-bezier(0.47,0,0.745,0.715)',
          );
          const e = (0, o.c)();
          (e
            .addElement((0, d.g)(m))
            .onFinish((b) => {
              1 === b && e.elements.length > 0 && e.elements[0].style.setProperty('display', 'none');
            })
            .fromTo('transform', 'translateY(0px)', `translateY(${c})`)
            .fromTo('opacity', 1, 0),
            n.addAnimation(e));
        }
        return n;
      };
    },
  },
]);
