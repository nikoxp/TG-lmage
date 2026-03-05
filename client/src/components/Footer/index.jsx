import { Link } from 'react-router-dom';
import { GithubLogo, Question, PaperPlaneTilt } from '@phosphor-icons/react';

/**
 * 底部组件
 * 包含版权信息和链接
 */
const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* 左侧 - 版权信息 */}
        <div className="footer-left">
          <p>
            © {currentYear} TG-Image. 基于{' '}
            <a
              href="https://telegram.org"
              target="_blank"
              rel="noopener noreferrer"
            >
              <PaperPlaneTilt className="footer-icon-inline" size={14} />
              Telegram
            </a>{' '}
            提供技术支持
          </p>
        </div>

        {/* 右侧 - 链接 */}
        <div className="footer-right">
          <Link to="/help" className="footer-link">
            <Question size={16} />
            帮助文档
          </Link>
          <a
            href="https://github.com/xiyewuqiu/new-lmage"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            <GithubLogo size={16} />
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
