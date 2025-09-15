import React, { useState, useRef } from 'react';
import MarkdownIt from 'markdown-it';
import { 
  FiCheckCircle, 
  FiBold, 
  FiItalic, 
  FiLink, 
  FiList, 
  FiGrid, // Icon for table
  FiArrowLeft // Icon for back button
} from 'react-icons/fi';

const md = new MarkdownIt();

const Step5Description = ({ submitPart, prevStep, handleChange, data }) => {
  const [description, setDescription] = useState(data.description || '');
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef(null); // Ref for textarea

  const handleDescriptionChange = (e) => {
    setDescription(e.target.value);
    handleChange('description', e.target.value);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    await submitPart();
    setIsLoading(false);
  };

  // Helper to insert markdown syntax
  const insertMarkdown = (syntaxStart, syntaxEnd = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = description.substring(start, end);
    const before = description.substring(0, start);
    const after = description.substring(end);

    const newText = `${before}${syntaxStart}${selectedText || 'text'}${syntaxEnd}${after}`;
    setDescription(newText);
    handleChange('description', newText);

    // Focus and adjust cursor position
    textarea.focus();
    setTimeout(() => {
      const newCursorPos = start + syntaxStart.length + (selectedText ? selectedText.length : 4);
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const insertTable = () => {
    const colsStr = window.prompt("Enter number of columns:", "2");
    const rowsStr = window.prompt("Enter number of rows (including header):", "2");

    const cols = parseInt(colsStr, 10);
    const rows = parseInt(rowsStr, 10);

    if (isNaN(cols) || isNaN(rows) || cols <= 0 || rows <= 0) {
      alert("Invalid input. Please enter positive numbers for rows and columns.");
      return;
    }

    if (rows < 1) {
        alert("Number of rows must be at least 1 (for the header).");
        return;
    }

    let tableSyntax = '\n';
    // Header row
    tableSyntax += `| ${Array(cols).fill('Header').join(' | ')} |\n`;
    // Separator row
    tableSyntax += `| ${Array(cols).fill('--------').join(' | ')} |\n`;
    // Data rows (start from 1 because header is row 0)
    for (let i = 1; i < rows; i++) {
      tableSyntax += `| ${Array(cols).fill('Cell').join(' | ')} |\n`;
    }
    tableSyntax += '\n'; // Add a newline after the table

    insertMarkdown(tableSyntax); // Use the helper to insert the generated table
  }

  return (
    <div className="upload-step">
      <h2>Step 5: Describe the Part</h2>
      <p className="step-description">
        Use Markdown to describe the part's features, common uses, known issues, or installation tips.
        Good descriptions help others understand the part better.
      </p>

      <div className="markdown-editor-container">
        {/* === Markdown Toolbar === */} 
        <div className="markdown-toolbar">
          <button className="markdown-tool-button" onClick={() => insertMarkdown('**', '**')} title="Bold"><FiBold /></button>
          <button className="markdown-tool-button" onClick={() => insertMarkdown('*', '*')} title="Italic"><FiItalic /></button>
          <button className="markdown-tool-button" onClick={() => insertMarkdown('[Link Text](http://)', '')} title="Link"><FiLink /></button>
          <button className="markdown-tool-button" onClick={() => insertMarkdown('\n- ', '')} title="List Item"><FiList /></button>
          <button className="markdown-tool-button" onClick={insertTable} title="Table"><FiGrid /></button>
        </div>
        {/* ======================== */} 
        <textarea
          ref={textareaRef} // Assign ref
          id="description"
          className="markdown-textarea"
          value={description}
          onChange={handleDescriptionChange}
          placeholder="e.g.,\n## Features\n- High flow rate\n- Direct fit for E36 M3\n\n## Common Issues\n- Plastic impeller prone to cracking\n\n## Installation Notes\n- Requires special tool XYZ\n- Bleed coolant system thoroughly"
          rows={10}
          required
        />
      </div>
      
      {/* Simple Preview Area */}
      <div className="markdown-preview-container">
        <h3>Preview</h3>
        <div 
          className="markdown-preview"
          dangerouslySetInnerHTML={{ __html: md.render(description || '*(Preview will appear here)*') }}
        />
      </div>

      <div className="navigation-buttons">
        <button onClick={prevStep} className="button back">
          <FiArrowLeft /> Back
        </button>
        <button 
          onClick={handleSubmit} 
          className="button next submit-button"
          disabled={!description || isLoading}
        >
          {isLoading ? 'Submitting...' : (
            <>
              Submit Part <FiCheckCircle />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Step5Description; 