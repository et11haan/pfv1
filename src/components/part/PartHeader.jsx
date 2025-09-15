import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import './PartHeader.css';

const PartHeader = ({ title, tags, partNumbers }) => {
  return (
    <div className="part-header">
      <h1 className="part-title">{title}</h1>
      {partNumbers && partNumbers.length > 0 && (
        <div className="part-info">
          {partNumbers.map((part, index) => (
            <React.Fragment key={part.number}>
              {part.link ? (
                <a href={part.link} target="_blank" rel="noopener noreferrer">
                  {part.number}
                </a>
              ) : (
                <span>{part.number}</span>
              )}
              {index < partNumbers.length - 1 && ' / '}
            </React.Fragment>
          ))}
        </div>
      )}
      <div className="part-tags">
        {tags.map((tag, index) => (
          <Link key={index} to={`/search?q=${encodeURIComponent(tag)}`} className={`part-tag ${tag.toLowerCase().includes('k-series') ? 'k-series-tag' : ''}`}>
            {tag}
          </Link>
        ))}
      </div>
    </div>
  );
};

PartHeader.propTypes = {
  title: PropTypes.string.isRequired,
  tags: PropTypes.arrayOf(PropTypes.string),
  partNumbers: PropTypes.arrayOf(PropTypes.shape({
    number: PropTypes.string.isRequired,
    link: PropTypes.string,
  })),
};

PartHeader.defaultProps = {
  tags: [],
  partNumbers: [],
};

export default PartHeader; 