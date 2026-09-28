import { Link } from "react-router";

function Hero({ title, description }) {
    return (
        <section className="hero">
            <div className="hero-main">
                <p className="hero-label">Local services, on your schedule</p>
                <h1>{title}</h1>
                <p className="hero-description">{description}</p>
                <Link className="hero-button" to="/services">
                    Browse local providers <span aria-hidden="true">↗</span>
                </Link>
            </div>

            <div className="hero-services" aria-label="Popular local services">
                <p className="hero-index-label">Find help with</p>
                <div className="hero-service-row"><span>01</span><span>Electrical work</span><span>+</span></div>
                <div className="hero-service-row"><span>02</span><span>Tutoring</span><span>+</span></div>
                <div className="hero-service-row"><span>03</span><span>Home cleaning</span><span>+</span></div>
                <div className="hero-service-row"><span>04</span><span>Repairs and more</span><span>+</span></div>
            </div>
        </section>
    );
}

export default Hero;