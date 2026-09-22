import "./site.css";

const BEANS = [2, 6, 9, 13];

/** Where to find the place. Lives at the end of the home page. */
export default function Visit() {
  return (
    <section className="visit" id="visit" aria-labelledby="visit-title">
      <div className="visit__beans" aria-hidden="true">
        {BEANS.map((n, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- decorative
          <img key={n} src={`/images/beans/bean-${n}.webp`} alt="" style={{ ["--i" as string]: i }} />
        ))}
      </div>

      <p className="visit__kicker"><i aria-hidden="true" /> Find us</p>
      <h2 id="visit-title" className="visit__title">
        <span className="serif">Come and sit</span>
        <span>for a while.</span>
      </h2>

      <dl className="visit__facts">
        <div>
          <dt>Where</dt>
          <dd>
            14 Prinsep Lane<br />
            Kolkata 700072
          </dd>
        </div>
        <div>
          <dt>When</dt>
          <dd>
            Every day<br />
            7 am until late
          </dd>
        </div>
        <div>
          <dt>Pastry shelf</dt>
          <dd>
            Out of the oven at seven<br />
            Gone by eleven
          </dd>
        </div>
        <div>
          <dt>Say hello</dt>
          <dd>
            <a href="mailto:hello@cumbre.coffee">hello@cumbre.coffee</a><br />
            <a href="tel:+913340001180">+91 33 4000 1180</a>
          </dd>
        </div>
      </dl>

      <a className="btn btn--wine visit__cta" href="https://maps.google.com/?q=Prinsep+Lane+Kolkata" rel="noreferrer noopener">
        Get directions
        <span className="btn__dot">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 13 13 3M5.5 3H13v7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </a>
    </section>
  );
}
