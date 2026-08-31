import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowDownRight,
  ArrowRight,
  ArrowUp,
  List,
  Mail,
  Menu,
  MoveUpRight,
  X,
} from 'lucide-react';
import {
  categories,
  featuredProjects,
  profile,
  riggingItems,
  spinItems,
  strengths,
} from './data/portfolio';
import type { PortfolioItem } from './data/portfolio';
import InteractiveModel from './components/InteractiveModel';
import ProfileAvatar from './components/ProfileAvatar';
import HeroMedia from './components/HeroMedia';
import SoftwareTools from './components/SoftwareTools';
import OptimizedImage from './components/OptimizedImage';
import MotionArtwork from './components/MotionArtwork';
import { assetUrl, IMAGE_SIZES } from './media';

type SectionLabelProps = {
  number: string;
  title: string;
};

const chapters = [
  { number: '01', label: '首页', english: 'HOME', href: '#home' },
  { number: '02', label: '个人介绍', english: 'ABOUT', href: '#about' },
  { number: '03', label: '精选项目', english: 'SELECTED', href: '#featured' },
  { number: '04', label: '个人优势', english: 'STRENGTHS', href: '#skills' },
  { number: '05', label: '绑定展示', english: 'RIGGING', href: '#rigging' },
  { number: '06', label: '作品展示', english: 'ARCHIVE', href: '#archive' },
  { number: '07', label: '联系方式', english: 'CONTACT', href: '#contact' },
];

const headerNavigation = chapters.slice(1, 6);

function SectionLabel({ number, title }: SectionLabelProps) {
  return (
    <div className="section-label">
      <span>{number}</span>
      <p>{title}</p>
      <i />
    </div>
  );
}

function Hero() {
  return (
    <section className="hero" id="home">
      <HeroMedia />

      <div className="hero-grid" aria-hidden="true" />

      <header className="site-header shell">
        <a className="brand" href="#home" aria-label="返回首页">
          <span className="brand-mark">
            <img src={assetUrl('/portfolio-assets/10-brand/brand-app-icon.png')} alt="" aria-hidden="true" />
          </span>
          <span className="brand-copy">
            3D ARTIST
            <br />
            PORTFOLIO
          </span>
        </a>

        <nav aria-label="主导航">
          {headerNavigation.map((item) => (
            <a href={item.href} key={item.href}>{item.label}</a>
          ))}
        </nav>

        <a className="contact-chip" href="#contact">
          联系我 <MoveUpRight size={16} />
        </a>

        <details className="mobile-menu">
          <summary aria-label="打开菜单">
            <Menu size={20} />
          </summary>
          <div>
            {chapters.slice(1).map((item) => (
              <a href={item.href} key={item.href}>{item.label}</a>
            ))}
          </div>
        </details>
      </header>

      <div className="hero-content shell">
        <div className="hero-kicker">
          <span>2026 — SELECTED WORKS</span>
          <span className="status-dot">AVAILABLE FOR PROJECTS</span>
        </div>

        <div className="hero-title-wrap">
          <p className="hero-role">3D MODELER · INDEPENDENT ANIMATOR</p>
          <h1>
            <span className="outline">数字造物</span>
            <span>作品集</span>
          </h1>
        </div>

        <div className="hero-bottom">
          <p>从建模到动画，探索技术、审美、材质与 3D 美学的更多可能。</p>
          <a className="scroll-cue" href="#about">
            <span>SCROLL TO EXPLORE</span>
            <ArrowDownRight size={26} />
          </a>
        </div>
      </div>

      <span className="hero-index" aria-hidden="true">
        01 / 07
      </span>
    </section>
  );
}

function About() {
  return (
    <section className="about section shell" id="about">
      <SectionLabel number="02" title="ABOUT / 个人介绍" />

      <div className="about-grid">
        <div className="about-title">
          <p className="about-greeting"><span>HELLO!</span> 我是{profile.name}</p>
          <h2>
            <span className="about-focus">
              <span>专注于建模、技术</span>
              <span>与动态表达的</span>
            </span>
            <span className="about-identity"><span>3D</span> 创作者</span>
          </h2>
        </div>

        <ProfileAvatar name={profile.name} />

        <div className="about-copy">
          <span className="eyebrow">PROFILE — {profile.role}</span>
          <div className="about-bio">
            <p>{profile.bio}</p>
            <p>{profile.bioSecondary}</p>
          </div>
          <dl>
            <div>
              <dt>UNIVERSITY</dt>
              <dd>{profile.location}</dd>
            </div>
            <div>
              <dt>EMAIL</dt>
              <dd>
                <a href={`mailto:${profile.email}`}>{profile.email}</a>
              </dd>
            </div>
            <div>
              <dt>WECHAT</dt>
              <dd>{profile.wechat}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="stats-grid">
        {profile.stats.map((stat, index) => (
          <div className="stat" key={stat.label}>
            <span>0{index + 1}</span>
            <strong>{stat.value}</strong>
            <p>{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturedProjects() {
  return (
    <section className="featured section shell" id="featured">
      <SectionLabel number="03" title="SELECTED / 精选项目" />

      <div className="section-heading">
        <h2>
          SELECTED
          <br />
          <span>PROJECTS</span>
        </h2>
        <p>精选具有代表性的个人项目，集中呈现从造型设计、结构到材质灯光与最终画面的完整创作过程。</p>
      </div>

      <div className="featured-list">
        {featuredProjects.map((project, index) => (
          <article
            className={`featured-card featured-${index + 1}`}
            key={project.number}
          >
            <OptimizedImage
              src={project.image}
              alt={`${project.title}项目`}
              sizes={index === 0 ? IMAGE_SIZES.featuredMain : IMAGE_SIZES.featuredSide}
              loading="lazy"
              decoding="async"
            />
            <div className="featured-overlay">
              <span>
                {project.number} / {project.year}
              </span>
              <div>
                <p>{project.type}</p>
                <h3>{project.title}</h3>
                <small>{project.english}</small>
              </div>
              <i>
                <ArrowDownRight />
              </i>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PortfolioArchive() {
  const groupBySeries = (items: PortfolioItem[]) => {
    const groups = new Map<string, PortfolioItem[]>();

    items.forEach((item) => {
      const group = groups.get(item.series) ?? [];
      group.push(item);
      groups.set(item.series, group);
    });

    return Array.from(groups.entries());
  };

  return (
    <section className="archive section" id="archive">
      <div className="shell">
        <SectionLabel number="06" title="ARCHIVE / 作品归档" />
        <div className="archive-intro">
          <h2>
            完整作品
            <br />
            <span>展示</span>
          </h2>
          <p>
            涵盖硬表面建模、细分曲面、布尔流程与早期创作，记录不同阶段对结构、形态和三维视觉语言的持续探索。
          </p>
        </div>
      </div>

      {categories.map((category, categoryIndex) => (
        <section className="category shell" id={category.id} key={category.id}>
          <header className="category-head">
            <span>{String(categoryIndex + 1).padStart(2, '0')}</span>
            <div>
              <p>{category.english}</p>
              <h3>{category.title}</h3>
            </div>
            <small>{String(category.items.length).padStart(2, '0')} WORKS</small>
          </header>

          <p className="category-description">{category.description}</p>

          <div className="series-list">
            {groupBySeries(category.items).map(([series, items], seriesIndex) => (
              <section className="series-group" key={series}>
                <header className="series-head">
                  <span>SERIES {String(seriesIndex + 1).padStart(2, '0')}</span>
                  <h4>{series}</h4>
                  <small>{String(items.length).padStart(2, '0')} VIEWS</small>
                </header>

                <div className="series-grid">
                  {items.map((item, seriesItemIndex) => {
                    const itemIndex = category.items.findIndex(({ id }) => id === item.id);

                    return (
                      <article className={`work-card aspect-${item.aspect}${item.model ? ' work-model-card' : ''}`} key={item.id}>
                        <div className="work-media">
                          {item.model ? <InteractiveModel src={item.model} poster={item.image} title={item.title} /> : <OptimizedImage
                            src={item.image}
                            sizes={items.length % 2 === 1 && seriesItemIndex === items.length - 1 ? IMAGE_SIZES.full : IMAGE_SIZES.pair}
                            alt={item.title}
                            loading="lazy"
                            decoding="async"
                          />}
                          <span className="work-count">
                            {String(itemIndex + 1).padStart(2, '0')} /{' '}
                            {String(category.items.length).padStart(2, '0')}
                          </span>
                        </div>
                        <div className="work-meta">
                          <div>
                            <h4>{item.title}</h4>
                            <p>{item.caption}</p>
                          </div>
                          <ArrowDownRight size={18} />
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </section>
      ))}

      <section className="category spin-category shell" id="spin">
        <header className="category-head">
          <span>07</span>
          <div>
            <p>SPINE AND ANIMATION</p>
            <h3>Spine 与动画</h3>
          </div>
          <small>08 LOOPS</small>
        </header>

        <p className="category-description">
          通过连续展示、场景变化与结构细节，直观地呈现作品在不同角度下的完整形态。
        </p>

        <div className="spin-grid">
          {spinItems.map((item, index) => (
            <article className="spin-card" key={item.id}>
              <div>
                <MotionArtwork src={item.image} alt={item.title} />
                <span>{String(index + 1).padStart(2, '0')}</span>
              </div>
              <p>{item.title} · TURNTABLE</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function Strengths() {
  return (
    <section className="skills section shell" id="skills">
      <SectionLabel number="04" title="STRENGTHS / 个人优势" />

      <div className="skills-heading">
        <h2>
          持续钻研新技术
          <br />
          <span>乐于接受挑战</span>
        </h2>
        <p>
          从最初的体块与比例推敲，到材质、灯光和动态呈现，始终保持清晰、统一且可继续完善的制作标准。
        </p>
      </div>

      <div className="strength-grid">
        {strengths.map((item) => (
          <article className="strength-card" key={item.number}>
            <header>
              <span>{item.number}</span>
              <ArrowDownRight />
            </header>
            <div>
              <small>{item.english}</small>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
            <footer>
              {item.tags.map((tag) => (
                <i key={tag}>{tag}</i>
              ))}
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}

function Rigging() {
  return (
    <section className="rigging section shell" id="rigging">
      <SectionLabel number="05" title="RIGGING / 绑定展示" />

      <div className="section-heading rigging-heading">
        <h2>
          RIGGING
          <br />
          <span>绑定与控制</span>
        </h2>
        <p>
          展示机械结构、控制器设置与动画前的绑定逻辑。
        </p>
      </div>

      <div className="rigging-grid">
        {riggingItems.map((item, index) => (
          <article className="rigging-card" key={item.id}>
            <div className="rigging-media">
              <OptimizedImage src={item.image} sizes={IMAGE_SIZES.pair} alt={item.title} loading="lazy" decoding="async" />
              <span>{String(index + 1).padStart(2, '0')} / 04</span>
            </div>
            <footer>
              <div>
                <small>RIGGING · SETUP</small>
                <h3>{item.title}</h3>
              </div>
              <ArrowDownRight size={18} />
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section className="contact" id="contact">
      <div className="contact-grid" aria-hidden="true" />
      <div className="contact-inner shell">
        <SectionLabel number="07" title="CONTACT / 联系" />
        <p className="contact-lead">有一个值得实现的想法？</p>
        <h2>
          LET&apos;S MAKE
          <br />
          <span>IT REAL.</span>
        </h2>

        <p className="contact-description">
          如果你正在寻找三维建模、硬表面设计或动画视觉方面的合作伙伴，欢迎与我联系。
        </p>

        <div className="contact-actions">
          <a className="email-link" href={`mailto:${profile.email}`}>
            <Mail />
            {profile.email}
            <ArrowRight />
          </a>
          <a className="availability" href={`mailto:${profile.email}`}>
            <i />
            目前可接受新项目
            <MoveUpRight />
          </a>
        </div>

        <footer>
          <span>© 2026 {profile.name}</span>
          <a href="#home">
            BACK TO TOP <ArrowDown className="to-top" size={15} />
          </a>
          <span>3D MODELING · HARD SURFACE · MOTION</span>
        </footer>
      </div>
    </section>
  );
}

function FloatingNavigation() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationFrame = 0;

    const handleScroll = () => {
      if (animationFrame) return;

      animationFrame = window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const aboutSection = document.getElementById('about');
        const isPastHero = aboutSection
          ? currentScrollY >= aboutSection.offsetTop - 24
          : currentScrollY >= window.innerHeight;

        setShowTools(isPastHero);
        if (!isPastHero) setMenuOpen(false);

        animationFrame = 0;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  if (!showTools) return null;

  return (
    <div className="floating-tools">
      <div className={`chapter-jump${menuOpen ? ' is-open' : ''}`} ref={menuRef}>
        <div className="chapter-menu" id="chapter-menu" aria-hidden={!menuOpen}>
          <header>
            <span>QUICK NAVIGATION</span>
            <small>选择章节</small>
          </header>
          {chapters.map((chapter) => (
            <a href={chapter.href} key={chapter.href} onClick={() => setMenuOpen(false)}>
              <span>{chapter.number}</span>
              <strong>{chapter.label}</strong>
              <small>{chapter.english}</small>
            </a>
          ))}
        </div>

        <button
          className="floating-button chapter-button"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="chapter-menu"
          aria-label={menuOpen ? '关闭章节菜单' : '打开章节菜单'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={19} /> : <List size={19} />}
          <span>章节</span>
        </button>
      </div>

      <a className="floating-button back-to-top" href="#home" aria-label="一键返回顶部" title="返回顶部">
        <ArrowUp size={20} />
        <span>TOP</span>
      </a>
    </div>
  );
}

export default function App() {
  return (
    <main>
      <Hero />
      <About />
      <FeaturedProjects />
      <Strengths />
      <Rigging />
      <PortfolioArchive />
      <Contact />
      <SoftwareTools />
      <FloatingNavigation />
    </main>
  );
}
