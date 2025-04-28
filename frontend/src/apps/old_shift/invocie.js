import { useRef, forwardRef } from 'react';
import ReactToPrint from 'react-to-print';
import { Row, Col } from 'react-bootstrap';

const PaperRow = ({ right, right_bold, left, left_bold }) => {
    if (right_bold) {
        right = <b>{right}</b>;
    }
    if (left_bold) {
        left = <b>{left}</b>;
    }

    return (
        <Row style={{ margin: '0 0 0px 0' }}>
            {right && (
                <Col xs={8} style={{ textAlign: 'left' }}>
                    {right}
                </Col>
            )}
            {left && (
                <Col xs={4} style={{ textAlign: 'right' }}>
                    {left}
                </Col>
            )}
        </Row>
    );
};

const FullPageRow = ({ text, bold, styles }) => {
    if (bold) {
        text = <b>{text}</b>;
    }

    return (
        <Row style={{ ...styles, margin: '0 0 0px 0' }}>
            <Col xs={12} style={{ textAlign: 'left' }}>
                {text}
            </Col>
        </Row>
    );
};

const PageHeader = ({ title }) => (
    <Row style={{ margin: '10px 0 0px 0' }}>
        <Col xs={12} style={{ textAlign: 'left' }}>
            <h6 style={{ margin: '0 0 0px 0' }}>{title}</h6>
        </Col>
    </Row>
);

const Invoice = forwardRef(({ shift }, ref) => {
    const startDate = new Date(shift?.json_data.start_time);
    const endDate = new Date(shift?.json_data.end_time);
    const totalInOut = shift?.json_data.shift_money_cash - shift?.json_data.refund_cash;
    const inDrawerCash = shift?.json_data.start_shift_cash + totalInOut;
    const actualInDrawerCash = shift?.json_data.actual_cash;
    const differenceCash = actualInDrawerCash - inDrawerCash;
    const inDrawerVisa = shift?.json_data.shift_money_visa;
    const actualInDrawerVisa = shift?.json_data.actual_visa;
    const differenceVisa = actualInDrawerVisa - inDrawerVisa + shift?.json_data.refund_visa;
    const inventory = shift?.json_data.inventory;

    return (
        <div ref={ref}>
            <PageHeader title={`Drawer Report: ${shift.json_data.branch_name} - ${shift.profile.username}`} />
            
            <FullPageRow text={`Start Time: ${startDate.toLocaleString('en-US', {
                month: 'short',
                day: '2-digit',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true,
            })}`} />
            
            <FullPageRow text={`End Time: ${endDate.toLocaleString('en-US', {
                month: 'short',
                day: '2-digit',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true,
            })}`} />
            
            <FullPageRow text={shift?.json_data.branch_name} />

            <hr style={{ margin: '10px' }} />
            <FullPageRow text="Summary" />
            <hr style={{ margin: '10px' }} />

            <PaperRow right="Starting Cash" left={shift?.json_data.start_shift_cash} />
            <PaperRow right="Cash Sales" left={shift?.json_data.shift_money_cash} />
            <PaperRow right="Visa Sales" left={shift?.json_data.shift_money_visa} />
            <PaperRow right="Cash Refunds" left={shift?.json_data.refund_cash} />
            <PaperRow right="Visa Refunds" left={shift?.json_data.refund_visa} />
            <PaperRow right="Expected In Drawer Cash" left={inDrawerCash} right_bold left_bold />
            <PaperRow right="Actual In Drawer Cash" left={actualInDrawerCash} right_bold left_bold />
            <PaperRow right="Difference Cash" left={differenceCash} right_bold left_bold />
            <PaperRow right="Actual In Drawer Visa" left={actualInDrawerVisa} right_bold left_bold />
            <PaperRow right="Difference Visa" left={differenceVisa} right_bold left_bold />

            <hr style={{ margin: '10px' }} />
            <FullPageRow text="Inventory" />
            <hr style={{ margin: '10px' }} />

            {inventory && Object.entries(inventory).map(([key, item]) => (
                (item.sold + item.sold_at_square !== 0) && (
                    <div key={key}>
                        <PaperRow
                            right={key}
                            left={`${item.sold + item.sold_at_square}/${item.start_shift}`}
                        />
                    </div>
                )
            ))}
        </div>
    );
});

export const InvoicePrint = ({ shift }) => {
    const componentRef = useRef();

    return (
        <div className="container w-100">
            <div className="row w-50">
                <div style={{ border: '1px solid #000' }}>
                    <Invoice ref={componentRef} shift={shift} />
                    <ReactToPrint
                        trigger={() => (
                            <button style={{ margin: '10px' }} className="btn btn-outline-dark">
                                Print
                            </button>
                        )}
                        content={() => componentRef.current}
                    />
                </div>
            </div>
        </div>
    );
};
