
import { Link } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import FeaturedProjects from '../components/home/FeaturedProjects';
import BeforeAfterSlider from '../components/home/BeforeAfterSlider';
import TestimonialSlider from '../components/home/TestimonialSlider';

export default function HomePage() {
  return (
    <>
      <div className="flex flex-col w-full">

        {/* HERO SECTION */}

        <section className="relative w-full overflow-hidden bg-primary-container -mt-20">
          <div className="absolute inset-0 z-0">
            <img
              className="w-full h-full object-cover object-center opacity-100 mix-blend-luminosity scale-105 transform motion-safe:transition-transform duration-1000 ease-out"
              src="/images/screen.png"
              alt="Illustrative image: home hero kitchen"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary-container via-primary-container/60 to-primary-container/80"></div>
          </div>

          <div className="relative z-10 max-w-[1700px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin pt-36 pb-24 md:pt-44 md:pb-32 flex flex-col justify-end min-h-[640px] lg:min-h-[760px]">
            <div className="max-w-3xl space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/10 backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-surface">
                  Islamabad Interior Company
                </span>
              </div>

              <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-surface tracking-tight">
                Beautiful Interiors.
                <br />
                <span className="italic font-normal text-secondary-fixed">
                  Thoughtfully Designed.
                </span>
              </h1>

              <p className="font-body-lg text-body-lg text-surface-dim max-w-xl font-normal leading-relaxed">
                Explore Spanish-style kitchens, custom kitchens, modern wardrobes and interior doors made to fit your space.
              </p>

              <div className="pt-4 flex flex-wrap items-center gap-4">
                <Link
                  className="inline-flex items-center justify-center bg-secondary hover:bg-on-secondary-container text-surface font-label-md text-label-md uppercase tracking-widest px-8 py-4 rounded transition-all duration-200 group shadow-md"
                  to="/services"
                >
                  <span>Explore Our Services</span>
                  <Icon
                    name="arrow_forward"
                    className="text-[18px] ml-2 transform group-hover:translate-x-1 transition-transform"
                  />
                </Link>

                <Link
                  className="inline-flex items-center justify-center bg-surface/10 hover:bg-surface/20 text-surface font-label-md text-label-md uppercase tracking-widest px-7 py-4 rounded backdrop-blur-sm transition-all duration-200"
                  to="/contact"
                >
                  Contact Us
                </Link>
              </div>
            </div>

            <div className="mt-16 pt-8 grid grid-cols-2 md:grid-cols-4 gap-6 bg-surface/5 backdrop-blur-md p-6 rounded">
              <div>
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary-fixed block">
                  Services
                </span>
                <p className="font-headline-sm text-headline-sm text-surface mt-1">
                  Kitchens, Wardrobes, Doors
                </p>
              </div>

              <div>
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary-fixed block">
                  Location
                </span>
                <p className="font-headline-sm text-headline-sm text-surface mt-1">
                  Golra Road, Islamabad
                </p>
              </div>

              <div>
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary-fixed block">
                  Equipment
                </span>
                <p className="font-headline-sm text-headline-sm text-surface mt-1">
                  Modern Machinery
                </p>
              </div>

              <div>
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary-fixed block">
                  Based In
                </span>
                <p className="font-headline-sm text-headline-sm text-surface mt-1">
                  Islamabad
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ABOUT AUSPAK SECTION */}

        <section className="w-full bg-background py-space-xl">
          <div className="max-w-[1700px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">

              <div className="lg:col-span-6 space-y-6">
                <div className="inline-block">
                  <span className="font-label-md text-label-md uppercase tracking-widest text-secondary">
                    About Auspak
                  </span>
                  <div className="w-8 h-[2px] bg-secondary mt-1"></div>
                </div>

                <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">
                  Creating Spaces That Reflect Your Style.
                </h2>

                <p className="font-body-lg text-body-lg text-slate-text leading-relaxed">
                  Auspak Interior is an Islamabad-based interior company. We make Spanish-style kitchens, custom kitchens, modern wardrobes and interior doors according to your requirements.
                </p>

                <p className="font-body-md text-body-md text-slate-text leading-relaxed">
                  We work with you to understand your space and needs, and we use modern machinery to produce your interior products.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
                  <div className="bg-surface-container p-5 rounded space-y-2">
                    <Icon name="precision_manufacturing" className="text-secondary text-[26px]" />
                    <h3 className="font-label-lg text-label-lg uppercase tracking-wider text-primary">
                      Made to Order
                    </h3>
                    <p className="font-body-sm text-body-sm text-slate-text">
                      Each product is made according to your requirements.
                    </p>
                  </div>

                  <div className="bg-surface-container p-5 rounded space-y-2">
                    <Icon name="carpenter" className="text-secondary text-[26px]" />
                    <h3 className="font-label-lg text-label-lg uppercase tracking-wider text-primary">
                      Modern Machinery
                    </h3>
                    <p className="font-body-sm text-body-sm text-slate-text">
                      We use modern machinery in making your interior products.
                    </p>
                  </div>

                  <div className="bg-surface-container p-5 rounded space-y-2">
                    <Icon name="straighten" className="text-secondary text-[26px]" />
                    <h3 className="font-label-lg text-label-lg uppercase tracking-wider text-primary">
                      Custom Sizing
                    </h3>
                    <p className="font-body-sm text-body-sm text-slate-text">
                      Made to fit the measurements of your space.
                    </p>
                  </div>
                </div>

                <div className="pt-4">
                  <Link
                    className="inline-flex items-center gap-2 font-label-md text-label-md uppercase tracking-widest text-primary hover:text-secondary transition-colors"
                    to="/about"
                  >
                    <span>Learn More About Us</span>
                    <Icon name="arrow_forward" className="text-[16px]" />
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-6 relative">
                <div className="relative bg-surface-container-high rounded overflow-hidden shadow-xl aspect-[4/3] lg:aspect-[5/4]">
                  <img
                    className="w-full h-full object-cover"
                    src="/images/home-woodworker-detail.jpg"
                    alt="Illustrative image: home woodworker detail"
                    loading="lazy"
                  />
                  <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-primary/80 via-primary/30 to-transparent text-surface">
                    <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary-fixed block">
                      Islamabad
                    </span>
                    <p className="font-body-sm text-body-sm text-surface-bright mt-0.5">
                      Planned around the measurements of your space.
                    </p>
                  </div>
                </div>

                <div className="hidden sm:block absolute -bottom-6 -left-6 bg-surface p-6 rounded shadow-lg max-w-xs bg-surface/95 backdrop-blur-md">
                  <div className="flex items-center gap-3 mb-2">
                    <Icon name="verified" className="text-secondary text-[20px]" />
                    <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary">
                      Your Requirements First
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-slate-text">
                    We plan each product around how you use your space.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* OUR SERVICES SECTION */}

        <section className="w-full bg-surface-container-low py-space-xl">
          <div className="max-w-[1700px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin">
            <div className="max-w-2xl mb-12">
              <span className="font-label-md text-label-md uppercase tracking-widest text-secondary block mb-2">
                What We Do
              </span>
              <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">
                Our Services
              </h2>
              <p className="font-body-md text-body-md text-slate-text mt-3">
                Interior products made to fit your space and requirements.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">

              {/* SPANISH-STYLE KITCHENS */}

              <div className="bg-surface rounded overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div className="relative h-64 overflow-hidden bg-surface-container">
                  <img
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 ease-out"
                    src="/images/home-spanish-kitchen.jpg"
                    alt="Illustrative image: home spanish kitchen"
                    loading="lazy"
                  />
                  <span className="absolute top-4 left-4 bg-primary/80 backdrop-blur-md text-surface font-label-sm text-label-sm uppercase tracking-widest px-3 py-1 rounded">
                    Classic Style
                  </span>
                </div>

                <div className="p-6 flex flex-col flex-1 justify-between bg-surface">
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-primary group-hover:text-secondary transition-colors mb-2">
                      Spanish-Style Kitchens
                    </h3>
                    <p className="font-body-sm text-body-sm text-slate-text leading-relaxed">
                      Warm wood tones, framed cabinet doors and arch details, made to fit your kitchen.
                    </p>
                  </div>
                  <div className="pt-6 mt-6">
                    <Link
                      className="inline-flex items-center text-primary group-hover:text-secondary font-label-md text-label-md uppercase tracking-wider transition-colors"
                      to="/services#spanish-style-kitchens"
                    >
                      <span>View Details</span>
                      <Icon name="arrow_forward" className="text-[16px] ml-1" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* CUSTOM KITCHENS */}

              <div className="bg-surface rounded overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div className="relative h-64 overflow-hidden bg-surface-container">
                  <img
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 ease-out"
                    src="/images/home-modern-kitchen.jpg"
                    alt="Illustrative image: home modern kitchen"
                    loading="lazy"
                  />
                  <span className="absolute top-4 left-4 bg-primary/80 backdrop-blur-md text-surface font-label-sm text-label-sm uppercase tracking-widest px-3 py-1 rounded">
                    Modern Style
                  </span>
                </div>

                <div className="p-6 flex flex-col flex-1 justify-between bg-surface">
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-primary group-hover:text-secondary transition-colors mb-2">
                      Custom Kitchens
                    </h3>
                    <p className="font-body-sm text-body-sm text-slate-text leading-relaxed">
                      Kitchens designed around your room size and daily use, with cabinets, drawers and storage planned to suit you.
                    </p>
                  </div>
                  <div className="pt-6 mt-6">
                    <Link
                      className="inline-flex items-center text-primary group-hover:text-secondary font-label-md text-label-md uppercase tracking-wider transition-colors"
                      to="/services#custom-kitchens"
                    >
                      <span>View Details</span>
                      <Icon name="arrow_forward" className="text-[16px] ml-1" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* MODERN WARDROBES */}

              <div className="bg-surface rounded overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div className="relative h-64 overflow-hidden bg-surface-container">
                  <img
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 ease-out"
                    src="/images/home-wardrobe.jpg"
                    alt="Illustrative image: home wardrobe"
                    loading="lazy"
                  />
                  <span className="absolute top-4 left-4 bg-primary/80 backdrop-blur-md text-surface font-label-sm text-label-sm uppercase tracking-widest px-3 py-1 rounded">
                    Wardrobes
                  </span>
                </div>

                <div className="p-6 flex flex-col flex-1 justify-between bg-surface">
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-primary group-hover:text-secondary transition-colors mb-2">
                      Modern Wardrobes
                    </h3>
                    <p className="font-body-sm text-body-sm text-slate-text leading-relaxed">
                      Fitted and walk-in wardrobes with shelves, drawers and hanging space planned around your belongings.
                    </p>
                  </div>
                  <div className="pt-6 mt-6">
                    <Link
                      className="inline-flex items-center text-primary group-hover:text-secondary font-label-md text-label-md uppercase tracking-wider transition-colors"
                      to="/services#modern-wardrobes"
                    >
                      <span>View Details</span>
                      <Icon name="arrow_forward" className="text-[16px] ml-1" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* INTERIOR DOORS */}

              <div className="bg-surface rounded overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div className="relative h-64 overflow-hidden bg-surface-container">
                  <img
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 ease-out"
                    src="/images/home-door.jpg"
                    alt="Illustrative image: home door"
                    loading="lazy"
                  />
                  <span className="absolute top-4 left-4 bg-primary/80 backdrop-blur-md text-surface font-label-sm text-label-sm uppercase tracking-widest px-3 py-1 rounded">
                    Doors
                  </span>
                </div>

                <div className="p-6 flex flex-col flex-1 justify-between bg-surface">
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-primary group-hover:text-secondary transition-colors mb-2">
                      Interior Doors
                    </h3>
                    <p className="font-body-sm text-body-sm text-slate-text leading-relaxed">
                      Interior doors made to your opening sizes, in finishes that match your rooms.
                    </p>
                  </div>
                  <div className="pt-6 mt-6">
                    <Link
                      className="inline-flex items-center text-primary group-hover:text-secondary font-label-md text-label-md uppercase tracking-wider transition-colors"
                      to="/services#interior-doors"
                    >
                      <span>View Details</span>
                      <Icon name="arrow_forward" className="text-[16px] ml-1" />
                    </Link>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* FEATURED PROJECTS */}

        {/*
        <FeaturedProjects />
        */}

        {/* BEFORE AND AFTER */}

        <BeforeAfterSlider />

        {/* WHY CHOOSE AUSPAK */}

        <section className="w-full bg-background py-space-xl">
          <div className="max-w-[1700px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin">
            <div className="max-w-2xl mb-12">
              <span className="font-label-md text-label-md uppercase tracking-widest text-secondary block mb-2">
                Our Standards
              </span>
              <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">
                Why Choose Auspak Interior
              </h2>
              <p className="font-body-md text-body-md text-slate-text mt-3">
                Made to your requirements, using modern machinery.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">

              <div className="bg-surface-container p-8 rounded space-y-4">
                <div className="w-12 h-12 rounded bg-surface flex items-center justify-center">
                  <Icon name="design_services" className="text-secondary text-[28px]" />
                </div>
                <h3 className="font-headline-sm text-headline-sm text-primary">
                  Customized Designs
                </h3>
                <p className="font-body-md text-body-md text-slate-text leading-relaxed">
                  Every kitchen, wardrobe, and door is made to fit your specific room dimensions and daily routines, avoiding standard modular fillers.
                </p>
              </div>

              <div className="bg-surface-container p-8 rounded space-y-4">
                <div className="w-12 h-12 rounded bg-surface flex items-center justify-center">
                  <Icon name="fit_screen" className="text-secondary text-[28px]" />
                </div>
                <h3 className="font-headline-sm text-headline-sm text-primary">
                  Attention to Detail
                </h3>
                <p className="font-body-md text-body-md text-slate-text leading-relaxed">
                  Careful panel alignment, clean edge finishing and neat fitting throughout.
                </p>
              </div>

              <div className="bg-surface-container p-8 rounded space-y-4">
                <div className="w-12 h-12 rounded bg-surface flex items-center justify-center">
                  <Icon name="layers" className="text-secondary text-[28px]" />
                </div>
                <h3 className="font-headline-sm text-headline-sm text-primary">
                  Quality Materials
                </h3>
                <p className="font-body-md text-body-md text-slate-text leading-relaxed">
                  We choose materials and fittings with you during consultation, to suit your budget and use.
                </p>
              </div>

              <div className="bg-surface-container p-8 rounded space-y-4">
                <div className="w-12 h-12 rounded bg-surface flex items-center justify-center">
                  <Icon name="tune" className="text-secondary text-[28px]" />
                </div>
                <h3 className="font-headline-sm text-headline-sm text-primary">
                  Modern Machinery
                </h3>
                <p className="font-body-md text-body-md text-slate-text leading-relaxed">
                  We use modern machinery to cut and prepare parts accurately.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* OUR PROJECT PROCESS SECTION REMOVED */}

        {/* TESTIMONIALS */}

        <TestimonialSlider />

        {/* CONTACT SECTION */}

        <section className="w-full bg-background pb-space-xl">
          <div className="max-w-[1700px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin">
            <div className="relative bg-primary-container text-surface rounded p-8 md:p-14 lg:p-16 overflow-hidden shadow-2xl">

              <div className="absolute top-0 inset-x-0 h-1 bg-secondary"></div>

              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

                <div className="lg:col-span-8 space-y-4">
                  <span className="font-label-md text-label-md uppercase tracking-widest text-secondary-fixed block">
                    Get in Touch
                  </span>

                  <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-surface">
                    Planning Your Next Interior Project?
                  </h2>

                  <p className="font-body-lg text-body-lg text-surface-dim max-w-2xl font-normal leading-relaxed">
                    Contact Auspak Interior to discuss your requirements or ask about your project.
                  </p>

                  <div className="pt-4 flex items-center gap-3 text-surface-dim">
                    <Icon name="location_on" className="text-secondary text-[22px] flex-shrink-0" />
                    <p className="font-body-sm text-body-sm">
                      Main Service Road, Golra Road, opposite G-11/1, Street #1, Islamabad, Pakistan
                    </p>
                  </div>
                </div>

                <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-4">
                  <Link
                    className="inline-flex items-center justify-center bg-secondary hover:bg-on-secondary-container text-surface font-label-md text-label-md uppercase tracking-widest px-8 py-4 rounded transition-colors text-center shadow-md"
                    to="/contact"
                  >
                    Request a Quote
                  </Link>

                  <Link
                    className="inline-flex items-center justify-center gap-2 bg-surface/10 hover:bg-surface/20 text-surface font-label-md text-label-md uppercase tracking-widest px-8 py-4 rounded backdrop-blur-sm transition-colors text-center"
                    to="/contact"
                  >
                    <Icon name="chat" className="text-[20px]" />
                    <span>WhatsApp Us</span>
                  </Link>
                </div>

              </div>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
