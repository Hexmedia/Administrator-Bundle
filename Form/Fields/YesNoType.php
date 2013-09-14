<?php

namespace Hexmedia\AdministratorBundle\Form\Fields;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\OptionsResolver\OptionsResolverInterface;

/**
 * Class YesNoType
 * @package Hexmedia\AdministratorBundle\Form\Fields
 */
class YesNoType extends AbstractType
{
    public function setDefaultOptions(OptionsResolverInterface $resolver)
    {
        $resolver->setDefaults(
            [
                'choices' => [
                    false => 'No',
                    true => 'Yes',
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
        return "yesno";
    }

}