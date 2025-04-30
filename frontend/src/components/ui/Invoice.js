import { Row, Col } from 'react-bootstrap';
import { useRef, forwardRef } from 'react';
import { get_user_and_jwt } from '../../components/logic/users';

// Helper Row with styling
const PaperRow = ({ right, right_bold, left, left_bold }) => (
  <Row className="mb-1">
    <Col xs={8} className="text-start">
      {right_bold ? <strong>{right}</strong> : right}
    </Col>
    <Col xs={4} className="text-end">
      {left_bold ? <strong>{left}</strong> : left}
    </Col>
  </Row>
);

// Single-line full-width text
const FullPageRow = ({ text, bold, styles }) => (
  <Row className="mb-1" style={styles}>
    <Col xs={12} className="text-start">
      {bold ? <strong>{text}</strong> : text}
    </Col>
  </Row>
);

// Section Header
const PageHeader = ({ title }) => (
  <Row className="my-3">
    <Col>
      <h5 className="fw-bold">{title}</h5>
    </Col>
  </Row>
);

// Main Component
const Invoice = forwardRef(({ shift, sub_shift, calculated_cash, calculated_visa }, ref) => {
  const user = get_user_and_jwt().user;

  const source = sub_shift || shift;
  const startDate = new Date(source?.start_time);
  const endDate = new Date(source?.end_time);

  const totalInOut = source.shift_money_cash - source.refund_cash;
  const expectedDrawer = source.start_shift_cash + totalInOut;
  const differenceCash = calculated_cash - expectedDrawer;

  const expectedVisa = source.shift_money_visa - source.refund_visa;
  const differenceVisa = calculated_visa - expectedVisa;

  return (
    <div ref={ref} className="p-3 bg-white" style={{ width: '80mm'}}>
      <PageHeader title={`Drawer Report: ${shift.branch_name} - ${user.username}`} />

      <FullPageRow
        text={`Start Time: ${startDate.toLocaleString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          hour12: true,
        })}`}
      />
      <FullPageRow
        text={`End Time: ${endDate.toLocaleString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          hour12: true,
        })}`}
      />

      <FullPageRow text={`Branch: ${shift?.branch_name}`} />

      <hr className="my-3" />
      <FullPageRow text="Summary" bold />
      <hr className="my-2" />

      <PaperRow right="Starting Cash" left={source.start_shift_cash} />
      <PaperRow right="Cash Sales" left={source.shift_money_cash} />
      <PaperRow right="Visa Sales" left={source.shift_money_visa} />
      <PaperRow right="Cash Refunds" left={source.refund_cash} />
      <PaperRow right="Visa Refunds" left={source.refund_visa} />

      <PaperRow right="Expected In Drawer" left={expectedDrawer} right_bold left_bold />
      <PaperRow right="Actual In Drawer Cash" left={calculated_cash} right_bold left_bold />
      <PaperRow right="Difference Cash" left={differenceCash} right_bold left_bold />
      <PaperRow right="Actual In Drawer Visa" left={calculated_visa} right_bold left_bold />
      <PaperRow right="Difference Visa" left={differenceVisa} right_bold left_bold />

      <hr className="my-3" />
      <FullPageRow text="Inventory" bold />
      <hr className="my-2" />

      {source?.inventory &&
        Object.entries(source.inventory).map(([key, item]) => {
          const totalSold = item.sold + item.sold_at_square;
          if (totalSold !== 0) {
            return (
              <PaperRow
                key={key}
                right={key}
                left={`${totalSold}/${item.start_shift}`}
              />
            );
          }
          return null;
        })}
    </div>
  );
});

export default Invoice;
