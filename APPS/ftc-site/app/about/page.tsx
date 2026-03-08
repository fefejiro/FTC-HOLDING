export const metadata = {
  title: "About | FTC",
  description: "FTC studio philosophy, focus, and mission."
};

export default function AboutPage() {
  return (
    <div className="container page-content">
      <h1>About FTC</h1>
      <p className="page-intro">
        FTC is a creative AI technology studio focused on intelligent software, automation
        systems, and digital product execution.
      </p>

      <section>
        <h2>How we think</h2>
        <p>
          Most software reacts after problems happen. FTC builds systems that intervene
          earlier, support better decisions, and still keep people in control.
        </p>
      </section>

      <section>
        <h2>What we build</h2>
        <p>
          Our work spans communication intelligence, audio and language context, and
          orchestration layers that connect tools, workflows, and data.
        </p>
      </section>

      <section>
        <h2>Why this model</h2>
        <p>
          FTC operates as both a client service studio and a product lab. Client work
          funds execution while internal products grow reusable capability assets.
        </p>
      </section>
    </div>
  );
}

