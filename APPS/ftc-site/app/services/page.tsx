import Link from 'next/link';

export default function ServicesPage() {
  return (
    <>
      <h1>Services</h1>
      <p>
        At Fejiro Technology Consultancy Inc., we offer a range of services designed to meet the diverse needs of our
        clients. Below are the key areas of our expertise:
      </p>
      <ul>
        <li>
          <Link href="/services/enterprise-systems-infrastructure">
            Enterprise Systems & Infrastructure Consulting
          </Link>
        </li>
        <li>
          <Link href="/services/intelligent-systems-automation">
            Intelligent Systems & Automation Engineering
          </Link>
        </li>
        <li>
          <Link href="/services/product-technical-architecture">
            Product & Technical Architecture Advisory
          </Link>
        </li>
      </ul>
      <p>For more information on each service, please click on the links above.</p>
    </>
  );
}
