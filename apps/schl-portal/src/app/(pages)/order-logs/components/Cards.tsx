import React from 'react';
import Card from '../../crm/statistics/components/card/Card';

interface InfoCard {
    label: string;
    value: string;
    icon?: React.ReactNode;
}

interface Props {
    cards: InfoCard[];
}

const Cards: React.FC<Props> = ({ cards }) => {
    return (
        <div className="flex flex-wrap gap-3 mb-6">
            {cards.map((card, index) => (
                <Card
                    className="shadow-sm cursor-default"
                    key={index}
                    title={card.label}
                    description={card.value}
                    icon={card.icon}
                />
            ))}
        </div>
    );
};

export default Cards;
