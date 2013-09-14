<?php
namespace Hexmedia\AdministratorBundle\Form\Fields;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\OptionsResolver\OptionsResolverInterface;

/**
 * Class PublicationType
 * @package Hexmedia\AdministratorBundle\Form\Fields
 */
class PublicationType extends AbstractType
{
    public function setDefaultOptions(OptionsResolverInterface $resolver)
    {
        $resolver->setDefaults(
            [
                'choices' => [
                    0 => 'No',
                    1 => 'Yes',
                    2 => 'Planned'
                ]
            ]
        );
    }

    public function getParent()
    {
        return "choice";
    }

    public function getName()
    {
        return "publication";
    }

}