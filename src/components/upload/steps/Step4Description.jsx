import { useState, useRef } from 'react';
import { FiArrowLeft, FiCheck } from 'react-icons/fi';

// TODO: Replace with actual OpenAI API call setup for spam/relevance check
const mockOpenAIDescriptionCheck = async (description) => {
  console.log(`Mock OpenAI Description Check for: ${description.substring(0, 50)}...`);
  await new Promise(resolve => setTimeout(resolve, 700)); // Simulate API delay
  // Simple mock validation: Reject short descriptions or specific keywords
  if (description.length < 50 || description.toLowerCase().includes('spam')) {
    console.log('Mock OpenAI Description Check: Rejected');
    return { valid: false, reason: 'Description seems too short or contains restricted content.' };
  }
  // Check for excessive links (basic example)
  const linkCount = (description.match(/https?:\/\//g) || []).length;
  if (linkCount > 3) {
      console.log('Mock OpenAI Description Check: Rejected (too many links)');
      return { valid: false, reason: 'Please limit the number of external links in the description.' };
  }
  console.log('Mock OpenAI Description Check: Approved');
  return { valid: true, reason: '' };
};

const Step5Description = ({ submitPart, prevStep, handleChange, data }) => {
  const [description, setDescription] = useState(data.description || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef(null);

  const handleDescriptionChange = (e) => {
    setDescription(e.target.value);
    handleChange('description', e.target.value);
  };

  // --- Markdown Helper Functions ---
  const insertMarkdown = (syntaxStart, syntaxEnd = syntaxStart) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = description.substring(start, end);
    const beforeText = description.substring(0, start);
    const afterText = description.substring(end);

    let newText;
    let cursorPos = start + syntaxStart.length;

    if (selectedText) {
      // Wrap selected text
      newText = `${beforeText}${syntaxStart}${selectedText}${syntaxEnd}${afterText}`;
      cursorPos = end + syntaxStart.length + syntaxEnd.length;
    } else {
      // Insert syntax at cursor position
      newText = `${beforeText}${syntaxStart}${syntaxEnd}${afterText}`;
    }

    setDescription(newText);
    handleChange('description', newText); // Update parent state immediately

    // Set cursor position after state update
    // Use setTimeout to ensure textarea has updated in the DOM
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  };

  const insertTable = () => {
    const rows = parseInt(prompt("Enter number of table rows (including header):", "3"), 10);
    const cols = parseInt(prompt("Enter number of table columns:", "2"), 10);

    if (isNaN(rows) || isNaN(cols) || rows < 1 || cols < 1) {
      alert("Invalid table dimensions.");
      return;
    }

    let table = '\n';
    // Header row
    table += '| ' + Array(cols).fill('Header').join(' | ') + ' |\n';
    // Separator row
    table += '| ' + Array(cols).fill('------').join(' | ') + ' |\n';
    // Data rows
    for (let r = 1; r < rows; r++) {
      table += '| ' + Array(cols).fill('Cell').join(' | ') + ' |\n';
    }
    table += '\n';

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const newText = description.substring(0, start) + table + description.substring(textarea.selectionEnd);
    const cursorPos = start + table.length;

    setDescription(newText);
    handleChange('description', newText);

    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  };
  // --- End Markdown Helper Functions ---

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');
    const { valid, reason } = await mockOpenAIDescriptionCheck(description);
    setIsLoading(false);

    if (valid) {
      // TODO: Add further sanitization/security checks here or on the backend
      console.log('Frontend: Description passed validation, proceeding to submit.');
      submitPart(); // Call the final submit function passed from parent
    } else {
      setError(reason || 'There was an issue with the description. Please review and try again.');
      // Optionally shake the component
      // setIsShaking(true);
      // setTimeout(() => setIsShaking(false), 500);
    }
  };

  return (
    <div className="upload-step">
      <h2>Write the Part Description</h2>
      <div className="input-group markdown-editor-container">
        <label htmlFor="description">Description (Markdown Supported)</label>

        {/* Simple Markdown Toolbar */}
        <div className="markdown-toolbar" style={{ marginBottom: '0.5rem', padding: '0.5rem 0', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="button markdown-button" onClick={() => insertMarkdown('**')}><strong>Bold</strong></button>
          <button type="button" className="button markdown-button" onClick={() => insertMarkdown('*')}><i>Italic</i></button>
          <button type="button" className="button markdown-button" onClick={() => insertMarkdown('[LinkText](http:\/\/)', '')}>Link</button> {/* Simplified Link */}
          <button type="button" className="button markdown-button" onClick={() => insertMarkdown('\n- ', '')}>List Item</button>
          <button type="button" className="button markdown-button" onClick={insertTable}>Table</button>
        </div>

        <textarea
          ref={textareaRef}
          id="description"
          className="textarea-field"
          value={description}
          onChange={handleDescriptionChange}
          placeholder="Describe the part like a Wikipedia entry. Include features, specs, common uses, compatible vehicles, etc. Use Markdown for formatting (e.g., **bold**, *italic*, lists, tables)."
          rows="15"
        />
        {error && <p style={{ color: 'red', fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</p>}
      </div>

      <div className="subtext-info">
        <p>Write a comprehensive description. Think about what information would be helpful to someone looking for this part.</p>
        <ul>
          <li>Use headings (`## Title`), lists (`- item` or `1. item`), tables, and links (`[text](url)`).</li>
          <li>Cite your sources where possible.</li>
          <li>Focus on factual information about the part itself.</li>
          <li>Avoid promotional language or excessive external links.</li>
        </ul>
      </div>

      <div className="navigation-buttons">
        <button className="button back" onClick={prevStep} disabled={isLoading}>
          <FiArrowLeft /> Back
        </button>
        <button
          className="button submit" // Use submit class, but triggers validation first
          onClick={handleSubmit}
          disabled={!description || isLoading}
        >
          {isLoading ? 'Checking...' : 'Submit Part'}
          {!isLoading && <FiCheck />}
        </button>
      </div>
    </div>
  );
};

export default Step5Description; 